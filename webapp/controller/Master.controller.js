sap.ui.define([
	"./BaseController",
	"sap/ui/model/json/JSONModel",
	"sap/ui/core/routing/History",
	"sap/ui/model/Filter",
	"sap/ui/model/Sorter",
	"sap/ui/model/FilterOperator",
	"sap/m/GroupHeaderListItem",
	"sap/ui/Device",
	"sap/ui/core/Fragment",
	"../model/formatter"
], function (BaseController, JSONModel, History, Filter, Sorter, FilterOperator, GroupHeaderListItem, Device, Fragment, formatter) {
	"use strict";

	return BaseController.extend("sio.hcm.mandate.controller.Master", {

		formatter: formatter,

		/* =========================================================== */
		/* lifecycle methods                                           */
		/* =========================================================== */

		/**
		 * Called when the master list controller is instantiated. It sets up the event handling for the master/detail communication and other lifecycle tasks.
		 * @public
		 */
		onInit : function () {
			// Control state model
			var oSmartTable = this.byId("smartTable");
			var	oViewModel = this._createViewModel();
			
			this.setModel(oViewModel, "masterView");

			this.getRouter().getRoute("master").attachPatternMatched(this._onMasterMatched, this);
		},
		
		/**
		 * Event handler for the list selection event
		 * @param {sap.ui.base.Event} oEvent the list selectionChange event
		 * @public
		 */
		onSelectionChange : function (oEvent) {
			var oSmartTable = oEvent.getSource(),
				bSelected = oEvent.getParameter("selected");

			// skip navigation when deselecting an item in multi selection mode
			if (!(oSmartTable.getMode() === "MultiSelect" && !bSelected)) {
				// get the list item, either from the listItem parameter or from the event's source itself (will depend on the device-dependent mode).
				this._showDetail(oEvent.getParameter("listItem") || oEvent.getSource());
			}
		},

		/**
		 * Event handler for navigating back.
		 * It there is a history entry or an previous app-to-app navigation we go one step back in the browser history
		 * If not, it will navigate to the shell home
		 * @public
		 */
		onNavBack : function() {
			var sPreviousHash = History.getInstance().getPreviousHash(),
				oCrossAppNavigator = sap.ushell.Container.getService("CrossApplicationNavigation");

			if (sPreviousHash !== undefined || !oCrossAppNavigator.isInitialNavigation()) {
				// eslint-disable-next-line sap-no-history-manipulation
				history.go(-1);
			} else {
				oCrossAppNavigator.toExternal({
					target: {shellHash: "#Shell-home"}
				});
			}
		},

		/* =========================================================== */
		/* begin: internal methods                                     */
		/* =========================================================== */
		_createViewModel : function() {
			return new JSONModel({
				isFilterBarVisible: false,
				filterBarLabel: "",
				delay: 0,
				title: this.getResourceBundle().getText("masterTitleCount", [0]),
				noDataText: this.getResourceBundle().getText("masterListNoDataText"),
				sortBy: "Status",
				groupBy: "None"
			});
		},

		_onMasterMatched :  function() {
			//Set the layout property of the FCL control to 'OneColumn'
			this.getModel("appView").setProperty("/layout", "OneColumn");
		},

		/**
		 * Shows the selected item on the detail page
		 * On phones a additional history entry is created
		 * @param {sap.m.ObjectListItem} oItem selected Item
		 * @private
		 */
		_showDetail : function (oItem) {
			var bReplace = !Device.system.phone;
			// set the layout property of FCL control to show two columns
			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
			// this.getModel("appView").setProperty("/layout", "MidColumnFullScreen");
			oItem.setSelected(false);
			this.getRouter().navTo("object", {
				objectId : oItem.getBindingContext().getProperty("Reqid")
			}, bReplace);
		},
		onShowDetails: function(oEvent){
			
		},
		onCreate: function(oEvent){
			// var bReplace = !Device.system.phone;
			// set the layout property of FCL control to show two columns
			this.getModel("appView").setProperty("/layout", "TwoColumnsMidExpanded");
			// this.getModel("appView").setProperty("/layout", "MidColumnFullScreen");
			// this.getRouter().navTo("object", {}, bReplace);
			this.getRouter().navTo("create");
			
		},
		onSearch: function(oEvent){
			var filterData = oEvent.getSource().getFilterData();
			if(filterData && filterData.Pernr && filterData.Pernr.ranges){
				var range = {
					exclude: false,
					keyField: "Pernr",
					operation: "EQ",
					tokenText: "=00000000",
					value1: "00000000",
					value2: ""
				};
				filterData.Pernr.ranges.push(range);                  
				oEvent.getSource().setFilterData(filterData,true)
			}
		},
		onBeforeRebindTable: function(oEvent){
			debugger;
			let filterData = this.byId("smartFilterBar").getFilterData();
			if( filterData && filterData.Pernr && filterData.Pernr.ranges){
				filterData.Pernr.ranges=[];
				this.byId("smartFilterBar").setFilterData(filterData,true);
			}
		}

	});

});