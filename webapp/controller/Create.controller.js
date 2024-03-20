sap.ui.define([
	"sap/ui/core/library",
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"../model/formatter",
	"sap/m/library",
	"sap/ui/core/routing/History",
	"sap/ui/Device",
	'sap/m/MessagePopover',
	'sap/m/MessageItem'
], function (coreLibrary, BaseController, JSONModel, formatter, mobileLibrary, History, Device, MessagePopover,MessageItem) {
	"use strict";

	// shortcut for sap.m.URLHelper
	var URLHelper = mobileLibrary.URLHelper;
	var ValueState = coreLibrary.ValueState;
	
	var oMessagePopover;
		
	return BaseController.extend("sio.hcm.mandate.controller.Create", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		onInit: function () {
			// Model used to manipulate control states. The chosen values make sure,
			// create page is busy indication immediately so there is no break in
			// between the busy indication for loading the view's meta data
			
			var oViewModel = new JSONModel({
				busy: false,
				delay: 0,
				view: 'Create',
				editable: true,
				lineItemListTitle: this.getResourceBundle().getText("createLineItemTableHeading")
			});
			this.setModel(oViewModel, "viewModel");
			this.initMsgPopup();
			this.getRouter().getRoute("create").attachPatternMatched(this._onObjectMatched, this);
		},
		/**
		 * Binds the view to the object path and expands the aggregated line items.
		 * @function
		 * @param {sap.ui.base.Event} oEvent pattern match event in route 'object'
		 * @private
		 */
		_onObjectMatched: function (oEvent) {
			var that = this;
			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
			
			//bind context
			var oDataModel = this.getModel();
			
			that.getView().setBusy(true);
			// oDataModel.attachMetadataLoaded(function () {
			// oDataModel.metadataLoaded().then(function(){
				that.oContext = oDataModel.createEntry("/ZI_MANDREQ_HDR", {
					// inactive: true,
					refreshAfterChange: true,
					properties: { //default values
						Status: 'NEW',
						CurrentTask: '',
						Location: 'IN',
						Marsn: '002',
						Statustxt: that.getResourceBundle().getText("New")	
					},
					
					// groupId: "createGroup",
					// context: that.getView().getBindingContext(),
					created: function onCreated(oContext) {
						that.getView().setBindingContext(oContext);
						that.getView().setBusy(false);
						
					},
					success: function onSuccess(oSuccess) {
						that.getView().setBusy(false);
					},
					error: function onError(oError) {
						that.getView().setBusy(false);
					}
				});

				// that.getView().setBindingContext(that.oContext);
				
				oDataModel.setDefaultBindingMode("TwoWay");
				that.initMessagePopup();
				that.buildApprovalProcess(null);
				
			// });
			// });
		},

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
			if (this.byId("lineItemsList") &&
				this.byId("lineItemsList").getBinding("items") &&
				this.byId("lineItemsList").getBinding("items").isLengthFinal()) {
				if (iTotalItems) {
					sTitle = this.getResourceBundle().getText("createLineItemTableHeadingCount", [iTotalItems]);
				} else {
					//Display 'Line Items' instead of 'Line items (0)'
					sTitle = this.getResourceBundle().getText("createLineItemTableHeading");
				}
				oViewModel.setProperty("/lineItemListTitle", sTitle);
			}
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */
		
		// onAddLine: function (oEvent) {
			
		// 	// var oItemsTable = this.byId("lineItemsList"); // table with "rows" bound with path "ToLineItems" (navigation property of sales order)
		//     var oItemsTable = oEvent.getSource().getParent().getParent();
		//     var oItemsBinding = oItemsTable.getBinding("items");
		//     // var oModel = this.getView().getModel();
		    
		// 	 // create transient context for subentity (sales order line item) and display it in the items table
		// 	var newObj = {
		// 		Pernr : ""
		// 	};
		// 	var oItemContext = oItemsBinding.create(newObj);
		// 	// end-user may edit item data in a dialog
		// 	// oCreateDialog.setBindingContext(oItemContext);
		// },

// if (!this.oEscapePreventDialog) {
// 	this.oEscapePreventDialog = new Dialog({
// 		title: "Dialog with prevent close",
// 		content: new Text({ text: "Try to close this Dialog with the Escape key" }).addStyleClass("sapUiSmallMargin"),
// 		buttons: [
// 			new Button({
// 				text: "Simply close",
// 				press: function () {
// 					this.oEscapePreventDialog.close();
// 				}.bind(this)
// 			})
// 		],
// 		escapeHandler: function (oPromise) {
// 			if (!this.oConfirmEscapePreventDialog) {
// 				this.oConfirmEscapePreventDialog = new Dialog({
// 					title: "Are you sure?",
// 					content: new Text({ text: "Your unsaved changes will be lost" }),
// 					type: DialogType.Message,
// 					icon: IconPool.getIconURI("message-information"),
// 					buttons: [
// 						new Button({
// 							text: "Yes",
// 							press: function () {
// 								this.oConfirmEscapePreventDialog.close();
// 								oPromise.resolve();
// 							}.bind(this)
// 						}),
// 						new Button({
// 							text: "No",
// 							press: function () {
// 								this.oConfirmEscapePreventDialog.close();
// 								oPromise.reject();
// 							}.bind(this)
// 						})
// 					]
// 				});
// 			}

// 			this.oConfirmEscapePreventDialog.open();
// 		}.bind(this)
// 	});
// }

// this.oEscapePreventDialog.open();
			// var that = this;
			// var oDataModel = this.getModel();
			
			// 
			// // var to_items = oDataModel.getProperty("/to_items");
			// var oContext = this.getView().getBindingContext();//.getProperty("/to_items");
			// var to_items = [];
			// if(to_items){
			// 	var newObj = {};
			// 	to_items.push(newObj);
			// }
			// oDataModel.setProperty("/to_items", to_items);
			
			// oDataModel.read("/Head('" + this._businessPartnerID + "')/ToSalesOrders('" + this.Reqid + "')/to_items", {
			// 	urlParameters: {
			// 		"$top": 1,
			// 		"$select": "ItemPosition"
			// 	},
			// 	sorters: [
			// 		new Sorter("ItemPosition", true)
			// 	],
			// 	success: function(oData, response) {
			// 		var latestItemPosition = oData.results && oData.results.length > 0 ? parseInt(oData.results[0].ItemPosition, 10) + 1 : 0;
			// 		that.oNewItemContext = oDataModel.createEntry("/SalesOrderLineItemSet", {
			// 			properties: {
			// 				SalesOrderID: that.Reqid, 
			// 				DeliveryDate: new Date(),
			// 				Quantity: "1",
			// 				ItemPosition: "" + latestItemPosition
			// 			}
			// 		});
			// 		that.onSalesOrderItemDialogOpen(true, that.oNewItemContext.getPath());
			// 	},
			// 	error: function(error) {
			// 		// TODO handle the error in the correct way
			// 	}
			// });
		// },
		// onDelete: function(oEvent){
		// 	oEvent.getParameter("listItem").getBindingContext().delete();
		// 	// 
		// 	// to delete from BE?
		// },
		onAddLineLocal: function (oEvent) {
			var newObj = {
				Pernr: "",
				Reqid: ""
			};
			var viewModel = this.getModel("viewModel");
			var to_items = viewModel.getProperty("/to_items");
			if (to_items) {
				to_items.push(newObj);
			} else {
				to_items = [newObj];
			}

			viewModel.setProperty("/to_items", to_items);
			viewModel.refresh(true)
		},
		onCancel: function (oEvent) {
			var that = this;
			
			//warning dialog to confirm
			if (!this.oApproveDialog) {
				this.oApproveDialog = new sap.m.Dialog({
					type: sap.m.DialogType.Message,
					state: ValueState.Warning,
					title: this.getResourceBundle().getText("Confirm"),
					// content: new Text({ text: "Do you want to submit this order?" }),
					content: new sap.m.Text({ text: this.getResourceBundle().getText("confirmLeaveMsg") }),
					beginButton: new sap.m.Button({
						type: sap.m.ButtonType.Emphasized,
						text: this.getResourceBundle().getText("Confirm"),
						press: function () {
							// sap.m.MessageToast.show(this.getResourceBundle().getText("DraftSaved"));
							this.oApproveDialog.close();
							
							// this.getModel().resetChanges();
							that.getModel().deleteCreatedEntry(that.oContext);
							that.getModel().refresh(true);
							that.onNavBack();
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
			
			//that.getModel().hasPendingChanges()?
			if(true){
				this.oApproveDialog.open();
			}
			else{
				// if no hanges just cancel without confirmation
				
			}
		},
		onSave: function (oEvent) {
			var that = this;
			var oModel = this.getModel();
			var SuccessMessage = this.getResourceBundle().getText("saveSuccessMessage");
			var ErrorMessage = this.getResourceBundle().getText("saveErrorMessage");
			var noChangesToSave = this.getResourceBundle().getText("noChangesToSave");

			// this.getModel().setDeferredGroups(["createGroup"]);
			
			if(oModel.hasPendingChanges()){
				that.getView().setBusy(true);
				oModel.submitChanges({
					// groupId: "createGroup",
					success: function onSuccess(oData, oResponse) {
						// debugger;
						// that.getView().setBusy(false);
						
						if( (oData && oData.__batchResponses && oData.__batchResponses[0] && !oData.__batchResponses[0].response ) || 
							(oData && oData.__batchResponses && oData.__batchResponses[0] && oData.__batchResponses[0].response && 
							oData.__batchResponses[0].response.statusCode && oData.__batchResponses[0].response.statusCode !== '400') ){ //if 400 request did not succeeded
							
							var Reqid = that.getView().getBindingContext().getProperty("Reqid");; //oData.Reqid
							if (!Reqid){
								oModel.submitChanges({
								// groupId: "createGroup",
								success: function onSuccess(oData2, oResponse) {
									debugger;
									that.messageBuilder(oData2);
									that.getView().setBusy(false);
									var Reqid = that.getView().getBindingContext().getProperty("Reqid");
									if (Reqid){
										sap.m.MessageToast.show(SuccessMessage);
										that.navtoDetail(Reqid);
									}
								},
								error: function onError(oError) {
									that.getView().setBusy(false);
									sap.m.MessageToast.show(ErrorMessage);
								}
							});
							} else{
								sap.m.MessageToast.show(SuccessMessage);
								that.navtoDetail(Reqid);
							}
							
						} else{
							that.getView().setBusy(false);
							that.messageBuilder(oData);
						}
						
						
					},
					error: function onError(oError) {
						that.getView().setBusy(false);
						sap.m.MessageToast.show(ErrorMessage);
					}
				});
				
			}
			else{
				//show 
				sap.m.MessageToast.show(noChangesToSave);
			}

		},
		navtoDetail: function (Reqid) {
			var bReplace = !Device.system.phone;
			// set the layout property of FCL control to show two columns
			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
			this.getRouter().navTo("object", {
				objectId : Reqid
			}, bReplace);
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