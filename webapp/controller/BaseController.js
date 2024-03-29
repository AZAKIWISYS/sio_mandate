sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/core/routing/History",
	"sap/ui/model/json/JSONModel",
	'sap/m/MessagePopover',
	'sap/m/MessageItem',
	'sap/ui/core/Fragment'
], function (Controller, History, JSONModel, MessagePopover, MessageItem, Fragment) {
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
					} else {
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
					sHighestSeverityIcon = sHighestSeverityIcon !== "Negative" && sHighestSeverityIcon !== "Critical" ? "Success" :
						sHighestSeverityIcon;
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
			oMsgModel.setProperty("/highestSeverityMessages", oMsgModel.getProperty("/messageSet").reduce(function (iNumberOfMessages,
				oMessageItem) {
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
		},
		resetMessages: function () {
			//clear messageSet property
			var oMsgModel = this.getModel("msgModel");
			if (oMsgModel) {
				oMsgModel.setProperty("/messageSet", []);
			}
			this.initMessagePopup();
		},
		messageBuilder: function (oData, Action) {
			var oController = this;
			var oView = oController.getView();
			var oMsgModel = oController.getModel("msgModel");
			if (oData.__batchResponses && oData.__batchResponses[0].response && oData.__batchResponses[0].response.body) {
				if (JSON.parse(oData.__batchResponses[0].response.body).error) {
					var err = JSON.parse(oData.__batchResponses[0].response.body).error.innererror;
					var error = err.errordetails;
					if (!error) return false;
					error.map(function (oValue) {
						oValue.counter = 1;
						oValue.type = oValue.severity.charAt(0).toUpperCase() + oValue.severity.slice(1);
						oValue.active = (oValue.target) ? true : false;
						if (oValue.target && oView.byId(oValue.target)) {
							oView.byId(oValue.target).setValueState(oValue.type);
							oView.byId(oValue.target).setValueStateText(oValue.message);
						} else if (oValue.target.lastIndexOf("to_items") > -1) {
							if (oValue.target.lastIndexOf("Pernr")) {
								oView.byId("lineItemsList").getItems()[parseInt(oValue.target.replace(/\D/g, "")) - 1].getCells()[0].setValueState(oValue.type);
								oView.byId("lineItemsList").getItems()[parseInt(oValue.target.replace(/\D/g, "")) - 1].getCells()[0].setValueStateText(
									oValue.message);
							}
						}
						return oValue;
					});
					oMsgModel.setProperty("/messageSet", error);
					oController.initMessagePopup();
				}
			}
			else if(oData.responseText){
				var error = JSON.parse(oData.responseText).error;
				if(!error) return false;
				var aError = [error];
				
				
				aError.map(function (oValue) {
					if(oValue.innererror && oValue.innererror.errordetails && oValue.innererror.errordetails[0] && oValue.innererror.errordetails[0].severity){
						oValue.type = oValue.innererror.errordetails[0].severity;
						oValue.type = oValue.type.charAt(0).toUpperCase() + oValue.type.slice(1);
					}
					
					// oValue.type = 'Error';
					oValue.counter = 1;
					oValue.message = oValue.message.value;
					return oValue;
				});
				oMsgModel.setProperty("/messageSet", aError);
				oController.initMessagePopup();
				
			}
			else {
				if (Action && Action == "Update") {
					var SuccessMessage = this.getResourceBundle().getText("saveSuccessMessage");
					sap.m.MessageToast.show(SuccessMessage);
				}
			}
		},
		onAddLine: function (oEvent) {
			var oController = this;
			var oItemsTable = this.byId("lineItemsList"); // table with "rows" bound with path "ToLineItems"
			// var oItemsTable = oEvent.getSource().getParent().getParent();
			var oItemsBinding = oItemsTable.getBinding("items");
			// var oModel = this.getView().getModel();

			var Reqid = this.getModel().getProperty("/Reqid");
			var Reqno = this.getModel().getProperty("/Reqno");

			// create transient context for subentity (sales order line item) and display it in the items table
			var initialData = {
				Reqid: Reqid,
				Reqno: Reqno,
				Pernr: "",
				Mists: "004",
				Mitxt: oController.getResourceBundle().getText("NEWREQUEST")
			};
			var oItemContext = oItemsBinding.create(initialData, true);
			// end-user may edit item data in a dialog
			// oCreateDialog.setBindingContext(oItemContext);
		},
		onDelete: function (oEvent) {
			var bindingContext = oEvent.getParameter("listItem").getBindingContext();
			var oModel = this.getModel();
			var path = bindingContext.getPath();
			var oTable = this.byId("lineItemsList");
			var oItemsBinding = oTable.getBinding("items");
			var obj = oModel.getObject(path);

			if (obj.Reqid) {
				oModel.setProperty(path + "/Deleted", true);
			} else {
				bindingContext.delete();
			}
			oModel.refresh(true);
			// bindingContext.delete(); //works on create view
			// //bindingContext.destroy(); //dont do nothing
			// oTable.removeItem(oEvent.getParameter("listItem")); //also working but cause error when add line
			// obj.remove(); //generate error

			// oTable.refreshAggregation("items");
			// oModel.refresh();
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
			var oSelected = oModel.getProperty("/ZI_MANAGERSEMPS('" + oEvent.getParameter("newValue") + "')");
			oModel.setProperty(sPath + "/PersonFullName", oSelected.PersonFullName);
			oModel.setProperty(sPath + "/OragnizationalUnitText", oSelected.OragnizationalUnitText);
			oModel.setProperty(sPath + "/PositionText", oSelected.PositionText);
			// this.byId("lineItemsList").getBinding("items").refresh();
		},
		buildApprovalProcess: function (sReqId) {
			var oController = this;
			var oModel = this.getModel();
			var oViewModel = this.getModel("viewModel");
			var oFilter = new sap.ui.model.Filter("RequestId", sap.ui.model.FilterOperator.EQ, (sReqId) ? sReqId : "");
			oModel.read("/ApprovalProcessSet", {
				filters: [oFilter],
				success: function (oData, oResponse) {
					if (oData.results.length > 0) {
						let oIconsMap = {
							0: "sap-icon://create-form",
							"A": "sap-icon://employee-approvals",
							"R": "sap-icon://employee-rejections"
						}
						let lanes = oData.results.map(function (oValue, index) {
							return {
								"id": index.toString(),
								"icon": (oIconsMap[index]) ? oIconsMap[index] : (oIconsMap[oValue.Decision])? oIconsMap[oValue.Decision] : "sap-icon://person-placeholder",
								"label": oValue.Username,
								"position": parseInt(index)
							};
						});
						oViewModel.setProperty("/lanes", lanes);
						let oStateMap = {
							"A": "Positive",
							"R": "Negative"
						};
						let oIconMap = {
							"A": "sap-icon://employee-approvals",
							"R": "sap-icon://employee-rejections"
						};
						let oStateTextMap = {
							"A": oController.getResourceBundle().getText("Approved"),
							"R": oController.getResourceBundle().getText("Rejected")
						};
						let nodes = oData.results.map(function (oValue, index) {
							return {
								"id": (index * 10).toString(),
								"lane": index.toString(),
								"title": (oValue.Fullname) ? oValue.Fullname : oValue.Username,
								"titleAbbreviation": oValue.Username,
								"children": (index !== oData.results.length - 1) ? [(index + 1) * 10] : null,
								"state": (oData.results.length <= 2 && index === 0) ? "Neutral" : (oStateMap[oValue.Decision]) ? oStateMap[oValue.Decision] :
									(index == 0) ? "Positive" : (oValue.Workitem === "999999999999") ? "Planned" : "Neutral",
								"stateText": (oData.results.length <= 2 && index === 0) ? oController.getResourceBundle().getText("Submit") : (
										oStateTextMap[oValue.Decision]) ? oStateTextMap[oValue.Decision] + ((oValue.Comments) ? "\n" + oController.getResourceBundle()
										.getText("WithComments") : "") : (index == 0) ? oController.getResourceBundle().getText("Submitted") : oController.getResourceBundle()
									.getText("Pending"),
								// "stateText":this.formatStateText(oData.results, oValue, index),
								"focused": false,
								"highlighted": false,
								"texts": oValue.PositionText,
								"Comments": oValue.Comments,
								"icon": (oIconMap[oValue.Decision])? oIconMap[oValue.Decision] : "sap-icon://create-form"
							};
						});
						oViewModel.setProperty("/nodes", nodes);
					}
				},
				error: function (oError) {

				}
			});
		},

		onNodePress: function (oEvent) {
			debugger;
			var oNode = oEvent.getParameters();
			var sPath = oNode.getBindingContext("viewModel").getPath();
			if (oNode.getBindingContext("viewModel").getObject().Comments) {
				if (!this.oQuickView) {
					Fragment.load({
						name: "sio.hcm.mandate.view.QuickView",
						type: "XML"
					}).then(function (oFragment) {
						this.oQuickView = oFragment;
						this.getView().addDependent(this.oQuickView);

						this.oQuickView.bindElement({ path:sPath, model: "viewModel"});
						this.oQuickView.openBy(oNode);
					}.bind(this));
				} else {
					this.oQuickView.bindElement({ path:sPath, model: "viewModel"});
					this.oQuickView.openBy(oNode);
				}
			}
		},
		dateChange: function (oEvent) {
			var value = oEvent.getParameter("value");

			if (oEvent.getSource().getId().includes("idBegda")) {
				var begda = new Date(value);
			} else {
				var begda = this.getView().byId("idBegda").getProperty("value");
			}

			if (oEvent.getSource().getId().includes("idEndda")) {
				var endda = new Date(value);
			} else {
				var endda = this.getView().byId("idEndda").getProperty("value");
			}

			// var begda = this.getView().byId("idBegda").getDateValue();
			// var endda = this.getView().byId("idEndda").getDateValue();

			if (!begda || !endda || (begda > endda))
				return;

			var diff = Math.abs(endda.getTime() - begda.getTime());
			var diffD = Math.ceil(diff / (1000 * 60 * 60 * 24)) + 1;
			// alert(diffD);
			// this.getView().byId("idNumberOfDays").setText(diffD);
		},
		formatStateText: function (results, oValue, index) {
			var stateText;
			let oStateTextMap = {
				"A": "Approved",
				"R": "Rejected"
			};
			if (oData.results.length <= 2 && index === 0) {
				stateText = this.getResourceBundle().getText("Submit");
			} else {
				if (oStateTextMap[oValue.Decision]) {
					stateText = oStateTextMap[oValue.Decision];
				} else {
					if (index == 0) {
						stateText = this.getResourceBundle().getText("Submitted");
					} else {
						stateText = this.getResourceBundle().getText("Pending");
					}

				}
			}
			return stateText;
		},
		mandateCalculation: function (oEvent) {
			var oController = this;
			var oView = oController.getView();
			var oViewModel = oController.getModel("viewModel");
			var oModel = oController.getModel();
			var sSourceId = oEvent.getSource().getId();
			var oMandCalc = {
				"Missbegda": oView.getBindingContext().getProperty('MissBegda') ? oView.getBindingContext().getProperty('MissBegda') :oView.getBindingContext().getProperty('MissEndda') ? oView.getBindingContext().getProperty('MissEndda') : new Date(),
				"Missendda": oView.getBindingContext().getProperty('MissEndda') ? oView.getBindingContext().getProperty('MissEndda') : oView.getBindingContext().getProperty('MissBegda') ? oView.getBindingContext().getProperty('MissBegda') : new Date(),
				"Cacnt": oView.getBindingContext().getProperty('Cacnt') ? oView.getBindingContext().getProperty('Cacnt') : ''
			}
			debugger;
			oViewModel.setProperty("/busy", true);
			oController.getModel().callFunction("/MandCalculate", {
				method: "POST",
				urlParameters: oMandCalc,
				refreshAfterChange: false,
				success: function onSuccess(oData, oResponse) {
					console.log(oData);
					oViewModel.setProperty("/busy", false);
					oView.byId("idBegda").setValue(oData.MandCalculate.Begda);
					oView.byId("idEndda").setValue(oData.MandCalculate.Endda);
					oView.byId("idCclas").setValue(oData.MandCalculate.Cclas);
					oView.byId("idCclastx").setValue(oData.MandCalculate.Cclastx? oData.MandCalculate.Cclastx : "");
					oView.byId("idMadur").setNumber(oData.MandCalculate.Madur);
					oView.byId("idDudif").setNumber(oData.MandCalculate.Dudif);
					oView.byId("idNmdys").setNumber(oData.MandCalculate.Nmdys);
					oView.byId("idTrdsa").setNumber(oData.MandCalculate.Trdsa);
					sap.m.MessageToast.show(oController.getResourceBundle().getText("MandateDatesUpdated"));
				},
				error: function onError(oError) {
					oController.messageBuilder(oError);
					oViewModel.setProperty("/busy", false);
				}
			});
		},
		initiateValueState: function(){
			if(this.byId("idMissBegda")){
				this.byId("idMissBegda").setValueState("None");}
			if(this.byId("idMissEndda")){
				this.byId("idMissEndda").setValueState("None");}
			
			if(this.byId("idBocit")){
				this.byId("idBocit").setValueState("None");}
			if(this.byId("idDscit")){
				this.byId("idDscit").setValueState("None");}
			if(this.byId("idCacnt")){
				this.byId("idCacnt").setValueState("None");}
		}

	});

});