const { InstanceBase, Regex, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const pkg = require('./package.json')
const MODULE_BUILD = pkg.version
const UpgradeScripts = require('./upgrades')
const UpdateActions = require('./actions')
const UpdateFeedbacks = require('./feedbacks')
const UpdateVariableDefinitions = require('./variables')
const PromisifiedWebSocket = require('promisifiedwebsocket')

class ModuleInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
		this.reconnectTimer = null
		this.isDestroyed = false
	}

	async init(config) {
		this.log('info', `QLC+ module loaded, build: ${MODULE_BUILD}`)
		this.qlcplusObj = { widgets: [], functions: [] }
		this.latestFunctionID = 0
		this.isDestroyed = false

		// Cache widget types across reconnects to avoid re-querying everything
		this.widgetTypeById = {}

		await this.configUpdated(config)
	}

	// When module gets deleted
	async destroy() {
		this.log('debug', 'destroy')
		this.isDestroyed = true
		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer)
			this.reconnectTimer = null
		}
		if (this.ws) {
			this.ws.close()
			delete this.ws
		}
	}

	async configUpdated(config) {
		this.config = config

		if (this.ws) {
			this.ws.close()
			delete this.ws
		}

		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer)
			this.reconnectTimer = null
		}

		this.createConnection()
	}

	// Return config fields for web config
	getConfigFields() {
		return [
			{
				type: 'textinput',
				id: 'host',
				label: 'Target IP',
				width: 8,
				regex: Regex.IP,
			},
			{
				type: 'textinput',
				id: 'port',
				label: 'Target Port',
				width: 4,
				regex: Regex.PORT,
				default: 9999,
			},
		]
	}

	updateActions() {
		UpdateActions(this)
	}

	updateFeedbacks() {
		UpdateFeedbacks(this)
	}

	updateVariableDefinitions() {
		UpdateVariableDefinitions(this)
	}

	async sendCommand(cmd) {
		if (!this.ws) return
		this.log('debug', `sending: ${cmd}`)

		try {
			const response = await this.ws.send(cmd)
			return response
		} catch (error) {
			this.log('error', `WebSocket error: ${error}`)
		}
	}

	parseQlcTypeReply(resp, expectedCommand) {
		const parts = resp?.toString?.().split('|') || []
		if (parts.length < 3) return ''

		// Verify the response is for the expected command
		// Response typically begins: QLC+API|<command>|...
		if (expectedCommand && parts[1] !== expectedCommand) return ''

		const candidate = parts[parts.length - 1] || ''

		// Reject numeric tokens (prevents caching widget id as "type")
		if (/^\d+$/.test(candidate)) return ''

		return candidate
	}

	formatFunctionLabel(fn, countsByType) {
		const raw = (fn?.labelRaw ?? fn?.label ?? '').trim()
		const type = fn?.type || ''

		// Base label: include type prefix when known
		const base = type ? `${type}: ${raw}` : raw

		// If we can't evaluate duplicates, just return base
		if (!countsByType || !type || !raw) return base

		// Duplicates only within the SAME type → append ID
		const key = `${type}|${raw}`
		if ((countsByType[key] || 0) > 1) {
			return `${base} [${fn.id}]`
		}

		return base
	}

	formatWidgetLabel(w, countsByType) {
		const raw = (w?.labelRaw ?? '').trim()
		const type = w?.widgetType || 'Widget'

		// Blank caption → always show ID
		if (!raw) {
			return `${type} #${w.id}`
		}

		const base = this.formatPrefixedLabel(type, raw)

		// Duplicates only within the SAME type → append ID
		const key = `${type}|${raw}`
		if ((countsByType?.[key] || 0) > 1) {
			return `${base} [${w.id}]`
		}

		return base
	}

	async getBaseData() {

		// Get Functions List
		this.qlcplusObj.functions = this.convertDataToJavascriptObject(await this.sendCommand('QLC+API|getFunctionsList'))

		// Enrich functions with type (no final label formatting yet)
		for (const fn of this.qlcplusObj.functions) {
			try {
				const resp = await this.sendCommand(`QLC+API|getFunctionType|${fn.id}`)
				fn.type = this.parseQlcTypeReply(resp, 'getFunctionType')
			} catch (e) {
				fn.type = fn.type || ''
			}
		}

		// Count duplicates by (type, raw name)
		const functionNameCountsByType = {}

		for (const fn of this.qlcplusObj.functions) {
			const raw = (fn.labelRaw ?? fn.label ?? '').trim()
			if (!raw) continue

			const type = fn.type || 'Other'
			const key = `${type}|${raw}`
			functionNameCountsByType[key] = (functionNameCountsByType[key] || 0) + 1
		}

		// Format labels (append [id] only when duplicate within same type)
		for (const fn of this.qlcplusObj.functions) {
			fn.label = this.formatFunctionLabel(fn, functionNameCountsByType)
		}

		// Sort functions by type, then by raw name
		this.qlcplusObj.functions.sort((a, b) => {
			// Empty types last
			const ta = a.type || 'ZZZ'
			const tb = b.type || 'ZZZ'
			if (ta !== tb) return ta.localeCompare(tb)

			// Secondary sort by raw name
			const na = (a.labelRaw ?? a.label ?? '').trim()
			const nb = (b.labelRaw ?? b.label ?? '').trim()
			return na.localeCompare(nb)
		})

		// Get Widgets List
		this.qlcplusObj.widgets = this.convertDataToJavascriptObject(await this.sendCommand('QLC+API|getWidgetsList'))

		// Enrich widgets with widgetType (no label formatting yet)
		for (const w of this.qlcplusObj.widgets) {
			try {
				const wid = String(w.id)

				let widgetType = this.widgetTypeById[wid]
				if (widgetType && /^\d+$/.test(widgetType)) widgetType = ''

				if (!widgetType) {
					const resp = await this.sendCommand(`QLC+API|getWidgetType|${w.id}`)
					widgetType = this.parseQlcTypeReply(resp, 'getWidgetType')
					if (widgetType) this.widgetTypeById[wid] = widgetType
				}

				w.widgetType = widgetType || ''
			} catch (e) {
				w.widgetType = w.widgetType || ''
			}
		}

		// Count duplicates by (widgetType, caption)
		const widgetCaptionCountsByType = {}

		for (const w of this.qlcplusObj.widgets) {
			const raw = (w.labelRaw ?? '').trim()
			if (!raw) continue

			const type = w.widgetType || 'Widget'
			const key = `${type}|${raw}`

			widgetCaptionCountsByType[key] = (widgetCaptionCountsByType[key] || 0) + 1
		}

		// Format labels (smart disambiguation within same type)
		for (const w of this.qlcplusObj.widgets) {
			try {
				w.label = this.formatWidgetLabel(w, widgetCaptionCountsByType)
			} catch (e) {
				w.label = w.labelRaw ?? w.label
			}
		}

		// Sort widgets by widgetType, then by caption (labelRaw)
		// Empty types last to avoid weird “unknown” items at the top
		this.qlcplusObj.widgets.sort((a, b) => {
			const ta = a.widgetType || 'ZZZ'
			const tb = b.widgetType || 'ZZZ'
			if (ta !== tb) return ta.localeCompare(tb)

			const na = a.labelRaw ?? a.label ?? ''
			const nb = b.labelRaw ?? b.label ?? ''
			return na.localeCompare(nb)
		})

		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions
		this.checkFeedbacks('functionState', 'functionRunning') // check feedbacks
	}

	convertDataToJavascriptObject(data) {
		const dataInArray = data.toString().split('|')
		// Process the data into a javascript object
		const resultArray = []
		for (let i = 0; i < dataInArray.slice(2).length; i += 2) {
			const id = dataInArray.slice(2)[i]
			const label = dataInArray.slice(2)[i + 1]
			resultArray.push({ id, label, labelRaw: label })
		}
		return resultArray
	}

	async createConnection() {
		if (!this.config.host) return
		this.log('debug', `connecting to ws://${this.config.host}:${this.config.port}/qlcplusWS`)
		const url = `ws://${this.config.host}:${this.config.port}/qlcplusWS`

		const connect = () => {
			if (this.isDestroyed) return

			if (this.ws) {
				try {
					this.ws.close()
				} catch (e) {
					// Ignore close errors
				}
				delete this.ws
			}

			this.updateStatus(InstanceStatus.Connecting)
			this.ws = new PromisifiedWebSocket(url)

			this.ws.on('websocketError', (error) => {
				this.log('error', `WebSocket error: ${error}`)
				this.scheduleReconnect()
			})

			this.ws.on('status', (status) => {
				this.log('info', `Status change: ${status}`)
			})

			this.ws.on('websocketOpen', () => {
				if (this.reconnectTimer) {
					clearTimeout(this.reconnectTimer)
					this.reconnectTimer = null
				}
				this.updateStatus(InstanceStatus.Ok)
				this.getBaseData()
			})

			this.ws.on('websocketClose', () => {
				this.updateStatus(InstanceStatus.Disconnected)
				this.scheduleReconnect()
			})

			this.ws.on('update', (message) => {
				// for now we use this to catch the subscription of the function updates
				let messageArray = message.toString().split('|')
				switch (messageArray[0]) {
					case 'FUNCTION':
						const targetFunction = this.qlcplusObj.functions.find((f) => f.id === messageArray[1])
						if (targetFunction) {
							targetFunction.status = messageArray[2]
							this.setVariableValues({ ['Function' + targetFunction.id]: targetFunction.status })
							this.checkFeedbacks('functionState', 'functionRunning')
						}
						break

					default:
						this.log('debug', 'no match for: ' + messageArray[0])
						break
				}
			})
		}

		// Add helper method for reconnection
		this.scheduleReconnect = () => {
			if (this.isDestroyed) return
			if (this.reconnectTimer) return

			this.reconnectTimer = setTimeout(() => {
				this.reconnectTimer = null
				connect()
			}, 2000)
		}

		connect()
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts)
