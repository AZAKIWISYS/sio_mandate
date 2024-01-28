sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"sap/ui/model/json/JSONModel",
	'sap/m/MessagePopover',
	'sap/m/MessageItem',
	'../controls/ODataListBinding'
], function (Controller, History, JSONModel, MessagePopover, MessageItem,ODataListBinding) {
	"use strict";


	return Controller.extend("sio.hcm.mandate.controller.BaseController", {
		oMessagePopover: new MessageItem({
			type: '{msgModel>type}',
			title: '{msgModel>code}',
			activeTitle: "{msgModel>active}",
			description: '{msgModel>message}',
			subtitle: '{msgModel>message}',
			counter: '{msgModel>counter}'
			// link: oLink
		}),
		/**
		 * Convenience method for accessing the router in every controller of the application.
		 * @public
		 * @returns {sap.ui.core.routing.Router} the router for this component
		 */
		getRouter: function () {
			return this.getOwnerComponent().getRouter();
		},

		/**
		 * Convenience method for getting the view model by name in every controller of the application.
		 * @public
		 * @param {string} sName the model name
		 * @returns {sap.ui.model.Model} the model instance
		 */
		getModel: function (sName) {
			return this.getView().getModel(sName);
		},

		/**
		 * Convenience method for setting the view model in every controller of the application.
		 * @public
		 * @param {sap.ui.model.Model} oModel the model instance
		 * @param {string} sName the model name
		 * @returns {sap.ui.mvc.View} the view instance
		 */
		setModel: function (oModel, sName) {
			return this.getView().setModel(oModel, sName);
		},

		/**
		 * Convenience method for getting the resource bundle.
		 * @public
		 * @returns {sap.ui.model.resource.ResourceModel} the resourceModel of the component
		 */
		getResourceBundle: function () {
			return this.getOwnerComponent().getModel("i18n").getResourceBundle();
		},

		/**
		 * Event handler for navigating back.
		 * It there is a history entry or an previous app-to-app navigation we go one step back in the browser history
		 * If not, it will replace the current entry of the browser history with the master route.
		 * @public
		 */
		onNavBack: function () {
			var sPreviousHash = History.getInstance().getPreviousHash(),
				oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

			if (sPreviousHash !== undefined || !oCrossAppNavigator.isInitialNavigation()) {
				// eslint-disable-next-line sap-no-history-manipulation
				history.go(-1);
			} else {
				this.getRouter().navTo("master", {}, true);
			}
		},

		initMsgPopup: function () {
			var oController = this;
			var oMsgModel = new JSONModel({
				messageSet: [],
				messageButtonIcon: "sap-icon://message-popup",
				messageButtonType: "Neutral",
				highestSeverityMessages: ""
			});
			this.setModel(oMsgModel, "msgModel");

			var oMessageTemplate = new MessageItem({
				type: '{msgModel>type}',
				title: '{msgModel>code}',
				activeTitle: "{msgModel>active}",
				description: '{msgModel>message}',
				subtitle: '{msgModel>message}',
				counter: '{msgModel>counter}'
			});


			this.oMessagePopover = new MessagePopover({
				items: {
					path: 'msgModel>/messageSet',
					template: oMessageTemplate
				},
				activeTitlePress: function (oEvent) {
					var target = oEvent.getParameter("item").getBindingContext("msgModel").getProperty("target");
					if (target.lastIndexOf("to_items") > -1) {
						if (target.lastIndexOf("Pernr")) {
							oController.byId("lineItemsList").getItems()[parseInt(target.replace(/\D/g, "")) - 1].getCells()[0].focus();
						}
					}
					else{
						oController.getView().byId(target).focus();
					}
					oController.oMessagePopover.close();
				}
			});

			this.byId("messagePopoverBtn").addDependent(this.oMessagePopover);
		},

		// Display the button type according to the message with the highest severity
		// The priority of the message types are as follows: Error > Warning > Success > Info
		buttonTypeFormatter: function () {
			var oMsgModel = this.getModel("msgModel");
			var sHighestSeverityIcon;
			var aMessages = oMsgModel.getProperty("/messageSet");

			aMessages.forEach(function (sMessage) {
				switch (sMessage.type) {
					case "Error":
						sHighestSeverityIcon = "Negative";
						break;
					case "Warning":
						sHighestSeverityIcon = sHighestSeverityIcon !== "Negative" ? "Critical" : sHighestSeverityIcon;
						break;
					case "Success":
						sHighestSeverityIcon = sHighestSeverityIcon !== "Negative" && sHighestSeverityIcon !== "Critical" ? "Success" : sHighestSeverityIcon;
						break;
					default:
						sHighestSeverityIcon = !sHighestSeverityIcon ? "Neutral" : sHighestSeverityIcon;
						break;
				}
			});

			oMsgModel.setProperty("/messageButtonType", sHighestSeverityIcon);
			return sHighestSeverityIcon;
		},

		// Display the number of messages with the highest severity
		highestSeverityMessages: function () {
			var oMsgModel = this.getModel("msgModel");
			var sHighestSeverityIconType = this.buttonTypeFormatter();
			var sHighestSeverityMessageType;

			switch (sHighestSeverityIconType) {
				case "Negative":
					sHighestSeverityMessageType = "Error";
					break;
				case "Critical":
					sHighestSeverityMessageType = "Warning";
					break;
				case "Success":
					sHighestSeverityMessageType = "Success";
					break;
				default:
					sHighestSeverityMessageType = !sHighestSeverityMessageType ? "Information" : sHighestSeverityMessageType;
					break;
			}
			oMsgModel.setProperty("/highestSeverityMessages", oMsgModel.getProperty("/messageSet").reduce(function (iNumberOfMessages, oMessageItem) {
				return oMessageItem.type === sHighestSeverityMessageType ? ++iNumberOfMessages : iNumberOfMessages;
			}, 0));
		},

		// Set the button icon according to the message with the highest severity
		buttonIconFormatter: function () {
			var oMsgModel = this.getModel("msgModel");
			var sIcon;
			var aMessages = oMsgModel.getProperty("/messageSet");

			aMessages.forEach(function (sMessage) {
				switch (sMessage.type) {
					case "Error":
						sIcon = "sap-icon://error";
						break;
					case "Warning":
						sIcon = sIcon !== "sap-icon://error" ? "sap-icon://alert" : sIcon;
						break;
					case "Success":
						sIcon = sIcon !== "sap-icon://error" && sIcon !== "sap-icon://alert" ? "sap-icon://sys-enter-2" : sIcon;
						break;
					default:
						sIcon = !sIcon ? "sap-icon://information" : sIcon;
						break;
				}
			});
			oMsgModel.setProperty("/messageButtonIcon", sIcon);
		},

		handleMessagePopoverPress: function (oEvent) {
			this.oMessagePopover.toggle(oEvent.getSource());
		},
		initMessagePopup: function () {
			this.buttonIconFormatter();
			this.highestSeverityMessages();
			
			// //clear message property
			// var oMsgModel = this.getModel("msgModel");
			// oMsgModel.setProperty("/messageSet", []);
		},
		messageBuilder: function (oData) {
			var oController = this;
			var oView = oController.getView();
			var oMsgModel = oController.getModel("msgModel");
			if (oData.__batchResponses && oData.__batchResponses[0].response && oData.__batchResponses[0].response.body) {
				if (JSON.parse(oData.__batchResponses[0].response.body).error) {
					var error = JSON.parse(oData.__batchResponses[0].response.body).error.innererror.errordetails;
					error.map(function (oValue) {
						oValue.counter = 1;
						oValue.type = oValue.severity.charAt(0).toUpperCase() + oValue.severity.slice(1);
						oValue.active = (oValue.target) ? true : false;
						if (oValue.target && oView.byId(oValue.target)) {
							oView.byId(oValue.target).setValueState(oValue.type);
							oView.byId(oValue.target).setValueStateText(oValue.message);
						}
						else if (oValue.target.lastIndexOf("to_items") > -1) {
							if (oValue.target.lastIndexOf("Pernr")) {
								oView.byId("lineItemsList").getItems()[parseInt(oValue.target.replace(/\D/g, "")) - 1].getCells()[0].setValueState(oValue.type);
								oView.byId("lineItemsList").getItems()[parseInt(oValue.target.replace(/\D/g, "")) - 1].getCells()[0].setValueStateText(oValue.message);
							}
						}
						return oValue;
					});
					oMsgModel.setProperty("/messageSet", error);
					oController.initMessagePopup();
				}
			}
		},
		onAddLine: function (oEvent) {
			sap.ui.model.odata.v2.ODataListBinding = ODataListBinding;
			var oItemsTable = this.byId("lineItemsList"); // table with "rows" bound with path "ToLineItems" (navigation property of sales order)
			// var oItemsTable = oEvent.getSource().getParent().getParent();
			var oItemsBinding = oItemsTable.getBinding("items");
			// var oModel = this.getView().getModel();
			
			var Reqid = this.getModel().getProperty("/Reqid");
			var Reqno = this.getModel().getProperty("/Reqno");
			
			// create transient context for subentity (sales order line item) and display it in the items table
			var newObj = {
				Reqid: Reqid,
				Reqno: Reqno,
				Pernr: ""
			};
			var oItemContext = oItemsBinding.create(newObj);
			// end-user may edit item data in a dialog
			// oCreateDialog.setBindingContext(oItemContext);
		},
		onDelete: function (oEvent) {
			oEvent.getParameter("listItem").getBindingContext().delete();
			// 
			// to delete from BE?
		},
		/**
		 * Set the full screen mode to false and navigate to master page
		 */
		onCloseDetailPress: function () {
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", false);
			// No item should be selected on master after detail page is closed
			this.getOwnerComponent().oListSelector.clearMasterListSelection();
			this.getRouter().navTo("master");
		},

		/**
		 * Toggle between full and non full screen mode.
		 */
		toggleFullScreen: function () {
			var bFullScreen = this.getModel("appView").getProperty("/actionButtonsInfo/midColumn/fullScreen");
			this.getModel("appView").setProperty("/actionButtonsInfo/midColumn/fullScreen", !bFullScreen);
			if (!bFullScreen) {
				// store current layout and go full screen
				this.getModel("appView").setProperty("/previousLayout", this.getModel("appView").getProperty("/layout"));
				this.getModel("appView").setProperty("/layout", "MidColumnFullScreen");
			} else {
				// reset to previous layout
				this.getModel("appView").setProperty("/layout", this.getModel("appView").getProperty("/previousLayout"));
			}
		},
		onChagePernr: function (oEvent) {
			var oModel = this.getModel();
			var oSource = oEvent.getSource();
			var sPath = oSource.getParent().getBindingContext().getPath();
			var oSelected = oModel.getProperty("/ZI_MANAGERSEMPS('"+oEvent.getParameter("newValue")+"')");
			oModel.setProperty( sPath + "/OragnizationalUnitText", oSelected.OragnizationalUnitText );
			oModel.setProperty( sPath + "/PositionText", oSelected.PositionText );
			// this.byId("lineItemsList").getBinding("items").refresh();
		}

	});

});