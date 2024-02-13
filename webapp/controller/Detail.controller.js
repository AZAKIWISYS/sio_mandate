sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter",
	"sap/m/library",
	"sap/ui/core/routing/History",
	"sap/ui/Device",
	"sap/m/Button",
	"sap/m/Text",
	"sap/m/Dialog"
], function (BaseController, JSONModel, formatter, mobileLibrary, History, Device, Button, Text, Dialog) {
	"use strict";

	// shortcut for sap.m.URLHelper
	var URLHelper = mobileLibrary.URLHelper;

	return BaseController.extend("sio.hcm.mandate.controller.Detail", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit : function () {
			// Model used to manipulate control states. The chosen values make sure,
			// detail page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			var oViewModel = new JSONModel({
				busy : false,
				delay : 0,
				editable: false,
				lineItemListTitle : this.getResourceBundle().getText("detailLineItemTableHeading")
			});

			this.getRouter().getRoute("object").attachPatternMatched(this._onObjectMatched, this);
			this.getRouter().getRoute("wfobject").attachPatternMatched(this._onWFObjectMatched, this);
			

			this.setModel(oViewModel, "viewModel");
			this.initMsgPopup();
			
			this.getOwnerComponent().getModel().metadataLoaded().then(this._onMetadataLoaded.bind(this));
		},

		/* =========================================================== */
		/* event handlers                                              */
		/* =========================================================== */

		/**
		 * Event handler when the share by E-Mail button has been clicked
		 * @public
		 */
		onSendEmailPress : function () {
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
		onShareInJamPress : function () {
			var oViewModel = this.getModel("viewModel"),
				oShareDialog = sap.ui.getCore().createComponent({
					name : "sap.collaboration.components.fiori.sharing.dialog",
					settings : {
						object :{
							id : location.href,
							share : oViewModel.getProperty("/shareOnJamTitle")
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
		onListUpdateFinished : function (oEvent) {
			var sTitle,
				iTotalItems = oEvent.getParameter("total"),
				oViewModel = this.getModel("viewModel");

			// only update the counter if the length is final
			if (this.byId("lineItemsList").getBinding("items").isLengthFinal()) {
				if (iTotalItems) {
					sTitle = this.getResourceBundle().getText("detailLineItemTableHeadingCount", [iTotalItems]);
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
		_onObjectMatched : function (oEvent) {
			
			//to save aupdates
			this.getModel().setDefaultBindingMode("TwoWay");
				
			var sObjectId =  oEvent.getParameter("arguments").objectId;
			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
			this.getModel().metadataLoaded().then( function() {
				var sObjectPath = this.getModel().createKey("ZI_MANDREQ_HDR", {
					Reqid :  sObjectId
				});
				this._bindView("/" + sObjectPath);
			}.bind(this));
		},
		_onWFObjectMatched: function (oEvent) {
			// debugger;

			//to save aupdates
			this.getModel().setDefaultBindingMode("TwoWay");
				
			// var sObjectId =  oEvent.getParameter("arguments").objectId;
			var sObjectId = this.getOwnerComponent().getComponentData().startupParameters.RequestNumber[0]
			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
			this.getModel().metadataLoaded().then( function() {
				var sObjectPath = this.getModel().createKey("ZI_MANDREQ_HDR", {
					Reqid :  sObjectId
				});
				this._bindView("/" + sObjectPath);
			}.bind(this));
		},

		/**
		 * Binds the view to the object path. Makes sure that detail view displays
		 * a busy indicator while data for the corresponding element binding is loaded.
		 * @function
		 * @param {string} sObjectPath path to the object to be bound to the view.
		 * @private
		 */
		_bindView : function (sObjectPath) {
			// Set busy indicator during view binding
			var oViewModel = this.getModel("viewModel");

			// If the view was not bound yet its not busy, only if the binding requests data it is set to busy again
			oViewModel.setProperty("/busy", false);

			this.getView().bindElement({
				path : sObjectPath,
				events: {
					change : this._onBindingChange.bind(this),
					dataRequested : function () {
						oViewModel.setProperty("/busy", true);
					},
					dataReceived: function () {
						oViewModel.setProperty("/busy", false);
					}
				}
			});
		},

		_onBindingChange : function () {
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

			oViewModel.setProperty("/saveAsTileTitle",oResourceBundle.getText("shareSaveTileAppTitle", [sObjectName]));
			oViewModel.setProperty("/shareOnJamTitle", sObjectName);
			oViewModel.setProperty("/shareSendEmailSubject",
				oResourceBundle.getText("shareSendEmailObjectSubject", [sObjectId]));
			oViewModel.setProperty("/shareSendEmailMessage",
				oResourceBundle.getText("shareSendEmailObjectMessage", [sObjectName, sObjectId, location.href]));
				this.buildApprovalProcess(sObjectId);
				
		},

		_onMetadataLoaded : function () {
			// Store original busy indicator delay for the detail view
			var iOriginalViewBusyDelay = this.getView().getBusyIndicatorDelay(),
				oViewModel = this.getModel("viewModel"),
				oLineItemTable = this.byId("lineItemsList"),
				iOriginalLineItemTableBusyDelay = oLineItemTable.getBusyIndicatorDelay();

			// Make sure busy indicator is displayed immediately when
			// detail view is displayed for the first time
			oViewModel.setProperty("/delay", 0);
			oViewModel.setProperty("/lineItemTableDelay", 0);

			oLineItemTable.attachEventOnce("updateFinished", function() {
				// Restore original busy indicator delay for line item table
				oViewModel.setProperty("/lineItemTableDelay", iOriginalLineItemTableBusyDelay);
			});

			// Binding the view will set it to not busy - so the view is always busy if it is not bound
			oViewModel.setProperty("/busy", true);
			// Restore original busy indicator delay for the detail view
			oViewModel.setProperty("/delay", iOriginalViewBusyDelay);
		},
		onCancel: function (oEvent) {
			var viewModel = this.getModel("viewModel");
			viewModel.setProperty("/editable", false);
			
			//reset changse
			var oLineItemTable = this.byId("lineItemsList");
			var oDataModel = this.getModel();
			debugger;
			
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
			// 						type: DialogType.Message,
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
				$.each(Object.keys(oDataModel.getPendingChanges()),function(index,sKey){oDataModel._discardEntityChanges(sKey, true);});
				oDataModel.resetChanges();
				// oDataModel.refresh(true);
				oLineItemTable.getBinding("items").resetData();
				oLineItemTable.getBinding("items").refresh(true)
				oDataModel.updateBindings(true);
			
			// }
			
		},
		onSave: function (oEvent) {
			var viewModel = this.getModel("viewModel");
			viewModel.setProperty("/editable", false);
			
			//save request
			var that = this;
			var oModel = this.getModel();
			var SuccessMessage = this.getResourceBundle().getText("editSuccessMessage");
			var ErrorMessage = this.getResourceBundle().getText("editErrorMessage");

			// this.getModel().setDeferredGroups(["createGroup"]);
			oModel.submitChanges({
				// groupId: "createGroup",
				success: function onSuccess(oData, oResponse) {
					
					// sap.m.MessageToast.show(SuccessMessage);
					that.messageBuilder(oData);
					
					// that.navtoDetail(oData.Reqid);s
				},
				error: function onError(oError) {
					that.messageBuilder(oError);
					// sap.m.MessageToast.show(ErrorMessage);
				}
			});
			
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
			
			var SuccessMessage = this.getResourceBundle().getText("submit_suc");
			
			that.getView().setBusy(true);
			oDataModel.callFunction("/PostRequest", {
				method: "POST",
				urlParameters : {
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
				},
				error: function onError(oError) {
					that.messageBuilder(oError);
					that.getView().setBusy(false);
				}
			});
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