const { InstanceBase, Regex, runEntrypoint, InstanceStatus } = require('@companion-module/base')
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
		this.rawWs = null

		// Stable websocket handler references allow detach/reattach across reconnects
		this.wsUpdateHandler = null
		this.wsErrorHandler = null
		this.wsStatusHandler = null
		this.wsOpenHandler = null
		this.wsCloseHandler = null
	}

	async init(config) {
		this.qlcplusObj = { widgets: [], functions: [] }
		this.latestFunctionID = 0
		this.isDestroyed = false

		// Define stable websocket handlers once per module instance.
		// These are attached to the current socket and detached during reconnect/teardown.
		this.wsUpdateHandler = (message) => {
			const messageArray = message.toString().split('|')

			// Suppress normal QLC+API replies and echoes.
			// The 'update' event receives all inbound messages; only some are subscription updates.
			if (messageArray[0] === 'QLC+API') {
				return
			}

			switch (messageArray[0]) {
				case 'FUNCTION': {
					// Block scope for safe const declarations in switch/case
					const fnId = String(messageArray[1] ?? '')
					const status = messageArray[2]

					// Robust id matching if ids ever become numeric
					const targetFunction = this.qlcplusObj.functions.find((f) => String(f.id) === fnId)
					if (targetFunction) {
						targetFunction.status = status
						this.setVariableValues({ ['Function' + targetFunction.id]: targetFunction.status })

						this.checkFeedbacks('functionState')
					}
					break
				}

				default:
					this.log('debug', 'no match for: ' + messageArray[0])
					break
			}
		}

		this.wsErrorHandler = (error) => {
			this.log('error', `WebSocket error: ${error}`)
			this.scheduleReconnect()
		}

		this.wsStatusHandler = (status) => {
			this.log('info', `Status change: ${status}`)
		}

		this.wsOpenHandler = () => {
			if (this.reconnectTimer) {
				clearTimeout(this.reconnectTimer)
				this.reconnectTimer = null
			}
			this.updateStatus(InstanceStatus.Ok)
			this.getBaseData()
		}

		this.wsCloseHandler = () => {
			this.updateStatus(InstanceStatus.Disconnected)
			this.scheduleReconnect()
		}

		await this.configUpdated(config)
	}

	// Centralize listener detachment to ensure consistent teardown and
	// avoid accumulating listeners across reconnect cycles.
	detachWebSocketListeners() {
		if (!this.ws) return

		try {
			this.ws.off('websocketError', this.wsErrorHandler)
			this.ws.off('status', this.wsStatusHandler)
			this.ws.off('websocketOpen', this.wsOpenHandler)
			this.ws.off('websocketClose', this.wsCloseHandler)
			this.ws.off('update', this.wsUpdateHandler)
		} catch (e) {
			try {
				this.ws.removeListener('websocketError', this.wsErrorHandler)
				this.ws.removeListener('status', this.wsStatusHandler)
				this.ws.removeListener('websocketOpen', this.wsOpenHandler)
				this.ws.removeListener('websocketClose', this.wsCloseHandler)
				this.ws.removeListener('update', this.wsUpdateHandler)
			} catch (e2) {
				// Ignore detach errors
			}
		}
	}

	// Send a message without PromisifiedWebSocket awaiting a reply.
	// QLC+ v4 fire-and-forget commands like "<id>|<value>" do not reply, and using
	// promisifiedwebsocket.send() for those can accumulate underlying 'message' listeners.
	sendRaw(cmd) {
		if (!this.rawWs) return false
		try {
			this.rawWs.send(cmd)
			return true
		} catch (e) {
			return false
		}
	}

	// When module gets deleted
	async destroy() {
		this.log('debug', 'destroy')
		this.isDestroyed = true
		this.rawWs = null

		if (this.reconnectTimer) {
			clearTimeout(this.reconnectTimer)
			this.reconnectTimer = null
		}

		if (this.ws) {
			// Detach listeners before closing for clean teardown
			this.detachWebSocketListeners()
			this.rawWs = null
			this.ws.close()
			delete this.ws
		}
	}

	async configUpdated(config) {
		this.config = config

		if (this.ws) {
			// Detach listeners before closing to prevent accumulation
			this.detachWebSocketListeners()
			this.rawWs = null
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

		// Only QLC+API requests are expected to respond.
		// For fire-and-forget commands (e.g. "<id>|<value>"), bypass PromisifiedWebSocket.send()
		// to avoid accumulating 'message' listeners waiting for a reply that never comes.
		if (!cmd.startsWith('QLC+API|')) {
			this.sendRaw(cmd)
			return
		}

		try {
			const response = await this.ws.send(cmd)
			return response
		} catch (error) {
			this.log('error', `WebSocket error: ${error}`)
		}
	}

	async getBaseData() {
		// Get Functions List
		this.qlcplusObj.functions = this.convertDataToJavascriptObject(await this.sendCommand('QLC+API|getFunctionsList'))
		this.qlcplusObj.widgets = this.convertDataToJavascriptObject(await this.sendCommand('QLC+API|getWidgetsList'))
		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions
		this.checkFeedbacks('functionState') // check feedbacks
	}

	convertDataToJavascriptObject(data) {
		const dataInArray = data.toString().split('|')
		// Process the data into a javascript object
		const resultArray = []
		for (let i = 0; i < dataInArray.slice(2).length; i += 2) {
			const id = dataInArray.slice(2)[i]
			const label = dataInArray.slice(2)[i + 1]
			resultArray.push({ id, label })
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
				// Detach existing listeners before closing/replacing the socket.
				this.detachWebSocketListeners()
				this.ws.close()
				try {
					this.ws.close()
				} catch (e) {
					// Ignore close errors
				}
				delete this.ws
			}

			this.updateStatus(InstanceStatus.Connecting)
			this.ws = new PromisifiedWebSocket(url)

			// Cache the underlying ws socket once, to keep sendRaw()
			// simple and avoid probing on every fire-and-forget send.
			// We intentionally do NOT use the wrapper's send() for these messages.
			this.rawWs =
				this.ws.ws ||
				this.ws._ws ||
				this.ws.socket ||
				this.ws.websocket ||
				null
			if (this.rawWs && typeof this.rawWs.send !== 'function') {
				this.rawWs = null
			}

			// Use stable handler references to allow detach/reattach.
			this.ws.on('websocketError', this.wsErrorHandler)
			this.ws.on('status', this.wsStatusHandler)
			this.ws.on('websocketOpen', this.wsOpenHandler)
			this.ws.on('websocketClose', this.wsCloseHandler)
			this.ws.on('update', this.wsUpdateHandler)
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
