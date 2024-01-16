/*global QUnit*/

sap.ui.define([
	"sap/ui/test/opaQunit",
	"./pages/NotFound",
	"./pages/Master"
], function (opaTest) {
	"use strict";

	QUnit.module("Phone not found");

	opaTest("Should see the not found page if the hash is something that matches no route", function (Given, When, Then) {
		// Arrangements
		Given.iStartMyFLPApp({
			intent: "Mandate-display",
			hash: "somethingThatDoesNotExist"
		});

		// Assertions
		Then.onTheNotFoundPage.iShouldSeeTheNotFoundPage().
			and.theNotFoundPageShouldSayResourceNotFound();
			Then.iLeaveMyFLPApp();
	});

	opaTest("Should see the not found detail page if an invalid object id has been called", function (Given, When, Then) {
		// Arrangements
		Given.iStartMyFLPApp({
			intent: "Mandate-display",
			hash: "/ZI_MANDREQ_HDR/SomeInvalidObjectId"
		});

		// Assertions
		Then.onTheNotFoundPage.iShouldSeeTheObjectNotFoundPage().
			and.theNotFoundPageShouldSayObjectNotFound();

		Then.iLeaveMyFLPApp();
	});

	opaTest("Should see the not found text for no search results", function (Given, When, Then) {
		// Arrangements
		Given.iStartMyFLPApp({
			intent: "Mandate-display"
		});

		// Actions
		When.onTheMasterPage.iSearchForSomethingWithNoResults();

		// Assertions
		Then.onTheMasterPage.iShouldSeeTheNoDataTextForNoSearchResults();

		// Cleanup
		Then.iLeaveMyFLPApp();
	});

});
