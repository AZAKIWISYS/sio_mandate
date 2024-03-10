sap.ui.define([
	"sap/ui/core/library",
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter",
	"sap/m/library",
	"sap/ui/core/routing/History",
	"sap/ui/Device",
	"sap/m/Button",
	"sap/m/Text",
	"sap/m/Dialog"
], function (coreLibrary, BaseController, JSONModel, formatter, mobileLibrary, History, Device, Button, Text, Dialog) {
	"use strict";

	// shortcut for sap.m.URLHelper
	var URLHelper = mobileLibrary.URLHelper;
	var ValueState = coreLibrary.ValueState;

	return BaseController.extend("sio.hcm.mandate.controller.Detail", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit: function () {
			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var oViewModel = new JSONModel({
				busy: false,
				delay: 0,
				// view: 'Detail',
				editable: false,
				lineItemListTitle: this.getResourceBundle().getText("detailLineItemTableHeading")
			});

			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
			this.getRouter().getRoute("wfobject").attachPatternMatched(this._onWFObjectMatched, this);

			this.setModel(oViewModel, "viewModel");
			this.initMsgPopup();

			this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));

			var printModel = new JSONModel({
				Source: "",
				Title: this.getResourceBundle().getText("QararPrint"),
				Height: "600px"
			});
			this.setModel(printModel, "printModel");
		},
		// onAfterRendering: function(oEvent){
		// 	//here to set foooter hidden if no buttons shown
		// 	var ObjectPageLayout = this.getView().byId("ObjectPageLayout");
		// 	if(ObjectPageLayout){
		// 		// ObjectPageLayout.setShowFooter(false);
		// 	}
		// },

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Event handler when the share by E-Mail button has been clicked
		 * @public
		 */
		onSendEmailPress: function () {
			var oViewModel = this.getModel("viewModel");

			URLHelper.triggerEmail(
				null,
				oViewModel.getProperty("/shareSendEmailSubject"),
				oViewModel.getProperty("/shareSendEmailMessage")
			);
		},

		/**
		 * Event handler when the share in JAM button has been clicked
		 * @public
		 */
		onShareInJamPress: function () {
			var oViewModel = this.getModel("viewModel"),
				oShareDialog = sap.ui.getCore().createComponent({
					name: "sap.collaboration.components.fiori.sharing.dialog",
					settings: {
						object: {
							id: location.href,
							share: oViewModel.getProperty("/shareOnJamTitle")
						}
					}
				});

			oShareDialog.open();
		},

		/**
		 * Updates the item count within the line item table's header
		 * @param {object} oEvent an event containing the total number of items in the list
		 * @private
		 */
		onListUpdateFinished: function (oEvent) {
			var sTitle,
				iTotalItems = oEvent.getParameter("total"),
				oViewModel = this.getModel("viewModel");
				

			// only update the counter if the length is final
			if (this.byId("lineItemsList").getBinding("items").isLengthFinal()) {
				if (oEvent.getSource().getVisibleItems().length) {
					sTitle = this.getResourceBundle().getText("detailLineItemTableHeadingCount", [oEvent.getSource().getVisibleItems().length]);
				} else {
					//Display 'Line Items' instead of 'Line items (0)'
					sTitle = this.getResourceBundle().getText("detailLineItemTableHeading");
				}
				oViewModel.setProperty("/lineItemListTitle", sTitle);
			}
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */

		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched: function (oEvent) {
			var viewModel = this.getModel("viewModel");
			//to save aupdates
			this.getModel().setDefaultBindingMode("TwoWay");

			var sObjectId = oEvent.getParameter("arguments").objectId;
			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");

			viewModel.setProperty("/view", "Detail");
			viewModel.setProperty("/editable", false);
			
			//simulate my inbox
			// viewModel.setProperty("/view", "WFDetail");
			// viewModel.setProperty("/editable", true);

			this.resetMessages();

			this.getModel().metadataLoaded().then(function () {
				var sObjectPath = this.getModel().createKey("ZI_MANDREQ_HDR", {
					Reqid: sObjectId
				});
				this._bindView("/" + sObjectPath);
			}.bind(this));
		},
		_onWFObjectMatched: function (oEvent) {
			// debugger;

			//to save aupdates
			var viewModel = this.getModel("viewModel");
			var printModel = this.getModel("printModel");

			this.getModel().setDefaultBindingMode("TwoWay");
			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");

			viewModel.setProperty("/view", "WFDetail");
			viewModel.setProperty("/editable", true);
			
			//set models in core level to be able to access them from my inbox app (S3Custom.controller.js)
			sap.ui.getCore().setModel(this.getModel(), "mandateModel");
			sap.ui.getCore().setModel(viewModel, "viewModel");
			sap.ui.getCore().setModel(printModel, "printModel");

			if (this.getOwnerComponent().getComponentData().startupParameters && this.getOwnerComponent().getComponentData().startupParameters.ReqId) {
				var sObjectId = this.getOwnerComponent().getComponentData().startupParameters.ReqId[0];

				// this.getView().byId("editButton").setVisible(true);

				this.getModel().metadataLoaded().then(function () {
					var sObjectPath = this.getModel().createKey("ZI_MANDREQ_HDR", {
						Reqid: sObjectId
					});
					this._bindView("/" + sObjectPath);
				}.bind(this));
			}
		},

		/**
		 * Binds the view to the object path. Makes sure that detail view displays
		 * a busy indicator while data for the corresponding element binding is loaded.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound to the view.
		 * @private
		 */
		_bindView: function (sObjectPath) {
			// Set busy indicator during view binding
			var oViewModel = this.getModel("viewModel");

			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			oViewModel.setProperty("/busy", false);

			this.getView().bindElement({
				path: sObjectPath,
				events: {
					change: this._onBindingChange.bind(this),
					dataRequested: function () {
						oViewModel.setProperty("/busy", true);
					},
					dataReceived: function () {
						oViewModel.setProperty("/busy", false);
					}
				}
			});
		},

		_onBindingChange: function () {
			var oView = this.getView(),
				oElementBinding = oView.getElementBinding();

			// No data for the binding
			if (!oElementBinding.getBoundContext()) {
				this.getRouter().getTargets().display("detailObjectNotFound");
				// if object could not be found, the selection in the master list
				// does not make sense anymore.
				this.getOwnerComponent().oListSelector.clearMasterListSelection();
				return;
			}

			var sPath = oElementBinding.getPath(),
				oResourceBundle = this.getResourceBundle(),
				oObject = oView.getModel().getObject(sPath),
				sObjectId = oObject.Reqid,
				sObjectName = oObject.Status,
				oViewModel = this.getModel("viewModel");

			this.getOwnerComponent().oListSelector.selectAListItem(sPath);

			oViewModel.setProperty("/saveAsTileTitle", oResourceBundle.getText("shareSaveTileAppTitle", [sObjectName]));
			oViewModel.setProperty("/shareOnJamTitle", sObjectName);
			oViewModel.setProperty("/shareSendEmailSubject",
				oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId]));
			oViewModel.setProperty("/shareSendEmailMessage",
				oResourceBundle.getText("shareSendEmailObjectMessage", [sObjectName, sObjectId, location.href]));
			this.buildApprovalProcess(sObjectId);

		},

		_onMetadataLoaded: function () {
			// Store original busy indicator delay for the detail view
			var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
				oViewModel = this.getModel("viewModel"),
				oLineItemTable = this.byId("lineItemsList"),
				iOriginalLineItemTableBusyDelay = oLineItemTable.getBusyIndicatorDelay();

			// Make sure busy indicator is displayed immediately when
			// detail view is displayed for the first time
			oViewModel.setProperty("/delay", 0);
			oViewModel.setProperty("/lineItemTableDelay", 0);

			oLineItemTable.attachEventOnce("updateFinished", function () {
				// Restore original busy indicator delay for line item table
				oViewModel.setProperty("/lineItemTableDelay", iOriginalLineItemTableBusyDelay);
			});

			// Binding the view will set it to not busy - so the view is always busy if it is not bound
			oViewModel.setProperty("/busy", true);
			// Restore original busy indicator delay for the detail view
			oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
		},
		onCancel: function (oEvent) {
			// debugger;
			var viewModel = this.getModel("viewModel");
				//warning dialog to confirm
				if (!this.oApproveDialog) {
					this.oApproveDialog = new sap.m.Dialog({
						type: sap.m.DialogType.Message,
						state: ValueState.Warning,
						title: this.getResourceBundle().getText("Confirm"),
						// content: new Text({ text: "Do you want to submit this order?" }),
						content: new sap.m.Text({
							text: this.getResourceBundle().getText("confirmLeaveDetailMsg")
						}),
						beginButton: new sap.m.Button({
							type: sap.m.ButtonType.Emphasized,
							text: this.getResourceBundle().getText("Confirm"),
							press: function () {
								viewModel.setProperty("/editable", false);
								this.oApproveDialog.close();
								this.getModel().resetChanges();
								// this.getModel().deleteCreatedEntry(this.oContext);
								this.getModel().refresh(true);
								// this.onNavBack();
							}.bind(this)
						}),
						endButton: new sap.m.Button({
							text: this.getResourceBundle().getText("Cancel"),
							press: function () {
								this.oApproveDialog.close();
							}.bind(this)
						})
					});
				}

				//this.getModel().hasPendingChanges()?
				if (this.getModel().hasPendingChanges()) {
					this.oApproveDialog.open();
				} else {
					// if no hanges just cancel without confirmation
					
					viewModel.setProperty("/editable", false);
				}

		},
		onCancelOld: function (oEvent) {
			var viewModel = this.getModel("viewModel");
			viewModel.setProperty("/editable", false);

			//reset changse
			var oLineItemTable = this.byId("lineItemsList");
			var oDataModel = this.getModel();

			// // oDataModel.getPendingChanges
			// if(oDataModel.hasPendingChanges()){

			// 	if (!this.oEscapePreventDialog) {
			// 		this.oEscapePreventDialog = new Dialog({
			// 			title: "Dialog with prevent close",
			// 			content: new Text({ text: "Try to close this Dialog with the Escape key" }).addStyleClass("sapUiSmallMargin"),
			// 			buttons: [
			// 				new Button({
			// 					text: "Simply close",
			// 					press: function () {
			// 						this.oEscapePreventDialog.close();
			// 					}.bind(this)
			// 				})
			// 			],
			// 			escapeHandler: function (oPromise) {
			// 				if (!this.oConfirmEscapePreventDialog) {
			// 					this.oConfirmEscapePreventDialog = new Dialog({
			// 						title: "Are you sure?",
			// 						content: new Text({ text: "Your unsaved changes will be lost" }),
			// 						type: sap.m.DialogType.Message,
			// 						icon: IconPool.getIconURI("message-information"),
			// 						buttons: [
			// 							new Button({
			// 								text: "Yes",
			// 								press: function () {
			// 									this.oConfirmEscapePreventDialog.close();
			// 									oPromise.resolve();
			// 								}.bind(this)
			// 							}),
			// 							new Button({
			// 								text: "No",
			// 								press: function () {
			// 									this.oConfirmEscapePreventDialog.close();
			// 									oPromise.reject();
			// 								}.bind(this)
			// 							})
			// 						]
			// 					});
			// 				}

			// 				this.oConfirmEscapePreventDialog.open();
			// 			}.bind(this)
			// 		});
			// 	}

			// }
			// else{

			// oDataModel.setChangeGroups({"*": {
			//         groupId: "changes"
			//     }
			// });
			// oDataModel.setDeferredGroups(["changes"]);
			$.each(Object.keys(oDataModel.getPendingChanges()), function (index, sKey) {
				oDataModel._discardEntityChanges(sKey, true);
			});
			oDataModel.resetChanges();
			// oDataModel.refresh(true);
			oLineItemTable.getBinding("items").resetData();
			oLineItemTable.getBinding("items").refresh(true);
			oDataModel.updateBindings(true);

			// }

		},
		onSave: function (oEvent) {
			var viewModel = this.getModel("viewModel");
			
			var oLineItemTable = this.byId("lineItemsList");
			
			//save request
			var that = this;
			var oModel = this.getModel();
			var SuccessMessage = this.getResourceBundle().getText("editSuccessMessage");
			var ErrorMessage = this.getResourceBundle().getText("editErrorMessage");
			var noChangesToSave = this.getResourceBundle().getText("noChangesToSave");

			// this.getModel().setDeferredGroups(["createGroup"]);
			if(oModel.hasPendingChanges()){
				oModel.submitChanges({
					// groupId: "createGroup",
					success: function onSuccess(oData, oResponse) {
						if( !oData.__batchResponses[0].response || (oData && oData.__batchResponses && oData.__batchResponses[0] && oData.__batchResponses[0].response 
							&& oData.__batchResponses[0].response.statusCode && oData.__batchResponses[0].response.statusCode !== '400') ){ //if 400 request did not succeeded
							
							viewModel.setProperty("/editable", false);
							// sap.m.MessageToast.show(SuccessMessage);
							that.messageBuilder(oData, 'Update');
							//refresh
							
							oLineItemTable.getBinding("items").refresh(true);
							that.getModel().refresh(true);
							that.getView().getElementBinding().refresh(true);
							// that.navtoDetail(oData.Reqid);
								
						}
						else{
							//show error messages
							that.messageBuilder(oData,);
						}
					},
					error: function onError(oError) {
						that.messageBuilder(oError);
						// sap.m.MessageToast.show(ErrorMessage);
					}
				});
			}
			else{
				sap.m.MessageToast.show(noChangesToSave);
			}

		},
		onEdit: function (oEvent) {
			var viewModel = this.getModel("viewModel");
			viewModel.setProperty("/editable", true);
			// this.getView().byId("cancelButton").setEnabled(true);

		},
		onSubmit: function (oEvent) {
			var that = this;
			var viewModel = this.getModel("viewModel");
			var oDataModel = this.getModel();
			var bindingContext = this.getView().getBindingContext();
			var Reqid = bindingContext.getProperty("Reqid");

			var ConfirmMsg = this.getResourceBundle().getText("Confirm");
			var SubmitMsg = this.getResourceBundle().getText("Submit");
			var CancelMsg = this.getResourceBundle().getText("Cancel");
			var SuccessMessage = this.getResourceBundle().getText("submit_suc");
			var submit_conf = this.getResourceBundle().getText("submit_conf");

			// confirm first
			if (!this.oApproveSubmitDialog) {
				this.oApproveSubmitDialog = new sap.m.Dialog({
					type: sap.m.DialogType.Message,
					title: ConfirmMsg,
					content: new sap.m.Text({
						text: submit_conf
					}),
					beginButton: new sap.m.Button({
						type: sap.m.ButtonType.Emphasized,
						text: SubmitMsg,
						press: function () {

							that.getView().setBusy(true);
							oDataModel.callFunction("/PostRequest", {
								method: "POST",
								urlParameters: {
									Reqid: Reqid ? Reqid : ""
								},
								refreshAfterChange: true,
								success: function onSuccess(oData, oResponse) {
									viewModel.setProperty("/editable", false);
									that.getView().getElementBinding().refresh(true);
									that.buildApprovalProcess("Reqid");

									that.getView().setBusy(false);

									// that.messageBuilder(oData);
									sap.m.MessageToast.show(SuccessMessage);

									//added logic to nav back to master page
									// that.onNavBack();
									that.getRouter().navTo("master", {}, true);
								},
								error: function onError(oError) {
									that.messageBuilder(oError);
									that.getView().setBusy(false);
								}
							});
							this.oApproveSubmitDialog.close();
						}.bind(this)
					}),
					endButton: new sap.m.Button({
						text: CancelMsg,
						press: function () {
							this.oApproveSubmitDialog.close();
						}.bind(this)
					}),
					afterClose: function(e){
						this.oApproveSubmitDialog.destroy();
						this.oApproveSubmitDialog = null;
					}.bind(this)
				});
			}

			this.oApproveSubmitDialog.open();

		},
		onClosePrint: function (oEvent) {
			oEvent.getSource().getParent().close();
			// this._printDialog.close();
			// this._printDialog.destroy();
		},
		onPrint: function (oEvent) {
			var bindingContext = this.getView().getBindingContext();
			var Reqid = bindingContext.getProperty("Reqid");
			
			// var path = "https://sapps4h.sio.gov.sa:8001/" + this.getModel().sServiceUrl + "/MandPrintoutSet('" + Reqid + "')/$value";
			var oDataModel = this.getModel();
			var path = oDataModel.sServiceUrl + "/MandPrintoutSet('" + Reqid + "')/$value";
			this.getModel("printModel").setProperty("/Source", path);
			
			var functionConfirm = function(){
				if(oDataModel.hasPendingChanges()){
					//show confirmationDialog to save first
					if (!this.oConfirmDialog) {
						this.oConfirmDialog = new sap.m.Dialog({
							type: sap.m.DialogType.Message,
							state: ValueState.Warning,
							title: this.getResourceBundle().getText("Confirm"),
							// content: new Text({ text: "Do you want to submit this order?" }),
							content: new sap.m.Text({
								text: this.getResourceBundle().getText("confirmSaveMsg")
							}),
							beginButton: new sap.m.Button({
								type: sap.m.ButtonType.Emphasized,
								text: this.getResourceBundle().getText("Confirm"),
								press: function () {
									this.oConfirmDialog.close();
									
									// promise here to ensure saved success
									var handleFulfilledA = function (e) {
										debugger;
										//if no response or response dont contain error
										if( !e.__batchResponses[0].response || (e && e.__batchResponses && e.__batchResponses[0] && e.__batchResponses[0].response && e.__batchResponses[0].response.statusCode
											&& e.__batchResponses[0].response.statusCode !== '400') ){ //if 400 request did not succeeded
											
											this._printDialog.open();
										}
										else{
											this.messageBuilder(e);
										}
									}.bind(this);
									var handleRejectedA = function (e) {
										return false;
									};
									const myPromise = new Promise((resolve, reject)=>{
									    oDataModel.submitChanges({
										    success: (oData)=>{resolve(oData);},
										    error: (oError)=>{reject(oError);}
										});
									});
									myPromise.then(handleFulfilledA, handleRejectedA);
					
									// this.onSave();
									// oDataModel.refresh(true);
									
									
								}.bind(this)
							}),
							endButton: new sap.m.Button({
								text: this.getResourceBundle().getText("Cancel"),
								press: function () {
									this.oConfirmDialog.close();
								}.bind(this)
							})
						});
					}
					this.oConfirmDialog.open();
				}
				else{
					this._printDialog.open();
				}
				
			}.bind(this);
			
			if (!this._printDialog) {
				sap.ui.core.Fragment.load({
					id: this.getView().getId(),
					name: "sio.hcm.mandate.view.Print",
					controller: this
				}).then(function (oDialog) {
					// var sId = this.createId("htmlControl");
					// var oHtml = new sap.ui.core.HTML(sId, {
					// 	// content: "<embed src='" + encodeURI(path) + "' width='1200' height='800'>",
					// 	content: "<iframe src='" + encodeURI(path) + "' width='1200' height='800'></iframe>",
					// 	// content: "<iframe src='"+ encodeURI(path) + "&embedded="true" + "style='width:1200px; height:900px;' frameborder='0'></iframe>",
					// 	preferDOM : false,
					// 	// use the afterRendering event for 2 purposes
					// 	afterRendering : function(oEvent) {

					// 	}.bind(this)
					// });
					// var oLayout = this.byId("staticContentLayout");
					// oLayout.addContent(oHtml);

					this.getView().addDependent(oDialog);
					var printModel = this.getModel("printModel");
					oDialog.setModel("printModel", printModel);
					oDialog.addStyleClass(this.getOwnerComponent().getContentDensityClass());
					this._printDialog = oDialog;
					// oDialog.open();
				}.bind(this)).then(function (oEvent) {
					//check here if hasPendingChanges?
					functionConfirm();
				}.bind(this));
			}
			else{
				functionConfirm();
			}
			
			

		},
		onNavBack: function () {
			var sPreviousHash = History.getInstance().getPreviousHash(),
				oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

			if (sPreviousHash !== undefined || !oCrossAppNavigator.isInitialNavigation()) {
				// eslint-disable-next-line sap-no-history-manipulation
				history.go(-1);
			} else {
				this.getRouter().navTo("master", {}, true);
			}
		}
	});

});