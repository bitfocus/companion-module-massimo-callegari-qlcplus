const { InstanceBase, Regex, runEntrypoint, InstanceStatus } = require('@companion-module/base')
const UpgradeScripts = require('./upgrades')
const UpdateActions = require('./actions')
const UpdateFeedbacks = require('./feedbacks')
const UpdateVariableDefinitions = require('./variables')
const PromisifiedWebSocket = require('promisifiedwebsocket')

class ModuleInstance extends InstanceBase {
	constructor(internal) {
		super(internal)
	}

	async init(config) {
		this.qlcplusObj = { widgets: [], functions: [] }
		this.latestFunctionID = 0
		this.config = config
		this.updateStatus(InstanceStatus.Connecting)
		this.createConnection() // create websocket connection
	}
	// When module gets deleted
	async destroy() {
		this.log('debug', 'destroy')
	}

	async configUpdated(config) {
		this.config = config
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
	async getBaseData() {
		// Get Functions List
		this.qlcplusObj.functions = this.convertDataToJavascriptObject(await this.sendCommand('QLC+API|getFunctionsList'))
		this.qlcplusObj.widgets = this.convertDataToJavascriptObject(await this.sendCommand('QLC+API|getWidgetsList'))
		this.updateActions() // export actions
		this.updateFeedbacks() // export feedbacks
		this.updateVariableDefinitions() // export variable definitions
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
		this.ws = new PromisifiedWebSocket(url)
		this.ws.on('websocketError', (error) => {
			this.log('error', `WebSocket error: ${error}`)
		})
		this.ws.on('status', (status) => {
			this.log('info', `Status change: ${status}`)
		})
		this.ws.on('websocketOpen', () => {
			this.updateStatus(InstanceStatus.Ok)
			this.getBaseData()
		})
		this.ws.on('websocketClose', () => {
			this.updateStatus(InstanceStatus.Disconnected)
		})
	}
}

runEntrypoint(ModuleInstance, UpgradeScripts)
