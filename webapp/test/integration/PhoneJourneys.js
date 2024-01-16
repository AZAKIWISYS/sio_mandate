sap.ui.define([
	"sap/ui/test/Opa5",
	"./arrangements/Startup",
	"./arrangements/FLP",
	"./NavigationJourneyPhone",
	"./NotFoundJourneyPhone"
], function (Opa5, Startup, FLP) {
	"use strict";

	Opa5.extendConfig({
		arrangements: new FLP(),
		assertions: new FLP(),
		viewNamespace: "sio.hcm.mandate.view.",
		autoWait: true
	});
});
