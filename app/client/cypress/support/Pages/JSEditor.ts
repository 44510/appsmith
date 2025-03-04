import { ObjectsRegistry } from "../Objects/Registry";
import {
  AppSidebar,
  AppSidebarButton,
  PageLeftPane,
  PagePaneSegment,
} from "./EditorNavigation";

export interface ICreateJSObjectOptions {
  paste: boolean;
  completeReplace: boolean;
  toRun: boolean;
  shouldCreateNewJSObj: boolean;
  lineNumber?: number;
  prettify?: boolean;
}
const DEFAULT_CREATE_JS_OBJECT_OPTIONS = {
  paste: true,
  completeReplace: false,
  toRun: true,
  shouldCreateNewJSObj: true,
  lineNumber: 4,
  prettify: true,
};

export class JSEditor {
  public agHelper = ObjectsRegistry.AggregateHelper;
  public locator = ObjectsRegistry.CommonLocators;
  public ee = ObjectsRegistry.EntityExplorer;
  public propPane = ObjectsRegistry.PropertyPane;
  private assertHelper = ObjectsRegistry.AssertHelper;

  //#region Element locators
  _runButton = "button.run-js-action";
  _settingsTab = "//span[text()='Settings']/parent::button";
  _codeTab = "//span[text()='Code']/parent::button";
  private _jsObjectParseErrorCallout =
    "div.t--js-response-parse-error-call-out";

  private _onPageLoadSwitch = (functionName: string) =>
    `.${functionName}-on-page-load-setting
    input[role="switch"]`;
  private _onPageLoadSwitchStatus = (functionName: string) =>
    `//div[contains(@class, '${functionName}-on-page-load-setting')]//label/input`;

  private _jsObjName = ".t--js-action-name-edit-field span";
  public _jsObjTxt = ".t--js-action-name-edit-field input";
  public _newJSobj = "span:contains('New JS object')";
  private _bindingsClose = ".t--entity-property-close";
  public _propertyList = ".binding";
  _dialog = (dialogHeader: string) =>
    "//div[@role='dialog']//h3[contains(text(), '" + dialogHeader + "')]";
  _dialogBody = (jsFuncName: string) =>
    "//div[@role='dialog']//*[contains(text(), '" +
    Cypress.env("MESSAGES")?.QUERY_CONFIRMATION_MODAL_MESSAGE() +
    "')]//*[contains(text(),'" +
    jsFuncName +
    "')]";
  _dialogInDeployView =
    "//div[@role='dialog']//*[contains(text(), '" +
    Cypress.env("MESSAGES")?.QUERY_CONFIRMATION_MODAL_MESSAGE() +
    "')]";
  _funcDropdown = ".t--formActionButtons .function-select-dropdown";
  _funcDropdownValue = `${this._funcDropdown} p`;
  _funcDropdownOptions = ".rc-virtual-list .rc-select-item-option p";
  _getJSFunctionSettingsId = (JSFunctionName: string) =>
    `${JSFunctionName}-settings`;
  _asyncJSFunctionSettings = `.t--async-js-function-settings`;
  _debugCTA = `button.js-editor-debug-cta`;
  _lineinJsEditor = (lineNumber: number) =>
    ":nth-child(" + lineNumber + ") > .CodeMirror-line";
  _lineinPropertyPaneJsEditor = (lineNumber: number, selector = "") =>
    `${
      selector ? `${selector} ` : ""
    }.CodeMirror-line:nth-child(${lineNumber})`;
  _logsTab = "[data-testid=t--tab-LOGS_TAB]";
  _confirmationModalBtns = (text: string) =>
    "//div[@data-testid='t--query-run-confirmation-modal']//span[text()='" +
    text +
    "']";
  //#endregion

  //#region constants
  private isMac = Cypress.platform === "darwin";
  private selectAllJSObjectContentShortcut = `${
    this.isMac ? "{cmd}{a}" : "{ctrl}{a}"
  }`;
  //#endregion

  // Pastes or types content into field
  private HandleJsContentFilling(toPaste: boolean, JSCode: string, el: any) {
    if (toPaste) {
      this.agHelper.Paste(el, JSCode);
    } else {
      cy.get(el).type(JSCode, {
        parseSpecialCharSequences: false,
        delay: 40,
        force: true,
      });
    }
  }

  //#region Page functions
  public NavigateToNewJSEditor() {
    this.agHelper.ClickOutside(); //to enable click of below!
    AppSidebar.navigate(AppSidebarButton.Editor);
    PageLeftPane.switchSegment(PagePaneSegment.JS);
    cy.get(this._newJSobj).eq(0).click({ force: true });

    this.agHelper.RemoveUIElement(
      "Tooltip",
      Cypress.env("MESSAGES").ADD_QUERY_JS_TOOLTIP(),
    );
    //Checking JS object was created successfully
    this.assertHelper.AssertNetworkStatus("@jsCollections", 200);
    this.agHelper.AssertElementVisibility(this._jsObjTxt);
    // Assert that the name of the JS Object is focused when newly created
    this.agHelper.PressEnter();
    this.agHelper.PressEnter();
    // Assert that the name of the JS Object is no longer in the editable form after pressing "enter"
    this.agHelper.AssertElementAbsence(this._jsObjTxt);

    this.agHelper.Sleep();
  }

  public CreateJSObject(
    JSCode: string,
    options: Partial<ICreateJSObjectOptions> = {},
  ) {
    const {
      completeReplace,
      lineNumber,
      paste,
      prettify,
      shouldCreateNewJSObj,
      toRun,
    } = { ...DEFAULT_CREATE_JS_OBJECT_OPTIONS, ...options };

    shouldCreateNewJSObj && this.NavigateToNewJSEditor();
    if (!completeReplace) {
      const downKeys = "{downarrow}".repeat(lineNumber);
      cy.get(this.locator._codeMirrorTextArea)
        .first()
        .focus()
        .type(`${downKeys}  `)
        .then((el: any) => {
          this.HandleJsContentFilling(paste, JSCode, el);
        });
    } else {
      cy.get(this.locator._codeMirrorTextArea)
        .first()
        .focus()
        .type(this.selectAllJSObjectContentShortcut)
        .then((el: any) => {
          this.HandleJsContentFilling(paste, JSCode, el);
        });
    }

    this.agHelper.AssertAutoSave();
    if (prettify) {
      this.agHelper.ActionContextMenuWithInPane({ action: "Prettify code" });
      this.agHelper.AssertAutoSave();
    }

    if (toRun) {
      // Wait for JSObject parsing to get complete
      this.agHelper.Sleep(2000);
      //clicking 1 times & waits for 2 second for result to be populated!
      Cypress._.times(1, () => {
        this.agHelper.GetNClick(this._runButton, 0, true);
        this.agHelper.Sleep(2000);
      });
      cy.get(this.locator._empty).should("not.exist");
    }
    this.GetJSObjectName();
  }

  //Edit the name of a JSObject's property (variable or function)
  public EditJSObj(
    newContent: string,
    toPrettify = true,
    toVerifyAutoSave = true,
  ) {
    cy.get(this.locator._codeMirrorTextArea)
      .first()
      .focus()
      .type(this.selectAllJSObjectContentShortcut, { force: true })
      .then((el: JQuery<HTMLElement>) => {
        this.agHelper.Paste(el, newContent);
      });
    this.agHelper.Sleep(2000); //Settling time for edited js code
    toPrettify &&
      this.agHelper.ActionContextMenuWithInPane({ action: "Prettify code" });
    toVerifyAutoSave && this.agHelper.AssertAutoSave();
  }

  public ClearJSObj() {
    cy.get(this.locator._codeMirrorTextArea)
      .first()
      .focus()
      .type(this.selectAllJSObjectContentShortcut, { force: true })
      .type("{backspace}", { force: true });
    this.agHelper.Sleep(2000); //Settling time for edited js code
    this.agHelper.AssertAutoSave();
  }

  public RunJSObj() {
    this.agHelper.GetNClick(this._runButton);
    this.agHelper.Sleep(); //for function to run
    this.agHelper.AssertElementAbsence(this.locator._btnSpinner, 15000);
    this.agHelper.AssertElementAbsence(this.locator._empty, 5000);
  }

  public RenameJSObjFromPane(renameVal: string) {
    cy.get(this._jsObjName).click({ force: true });
    cy.get(this._jsObjTxt)
      .clear()
      .type(renameVal, { force: true })
      .should("have.value", renameVal)
      .blur();
    PageLeftPane.assertPresence(renameVal);
  }

  public RenameJSObjFromExplorer(entityName: string, renameVal: string) {
    this.ee.ActionContextMenuByEntityName({
      entityNameinLeftSidebar: entityName,
      action: "Edit name",
    });
    cy.xpath(this.locator._entityNameEditing(entityName)).type(
      renameVal + "{enter}",
    );
    PageLeftPane.assertPresence(renameVal);
  }

  public GetJSObjectName() {
    cy.get(this._jsObjName)
      .invoke("text")
      .then((text) => cy.wrap(text).as("jsObjName"));
  }

  public ValidateDefaultJSObjProperties(jsObjName: string) {
    this.ee.ActionContextMenuByEntityName({
      entityNameinLeftSidebar: jsObjName,
      action: "Show bindings",
    });
    cy.get(this._propertyList).then(function ($lis) {
      const bindingsLength = $lis.length;
      expect(bindingsLength).to.be.at.least(4);
      const expectedTexts = [
        "{{" + jsObjName + ".myFun2()}}",
        "{{" + jsObjName + ".myFun1()}}",
        "{{" + jsObjName + ".myVar1}}",
        "{{" + jsObjName + ".myVar2}}",
        "{{" + jsObjName + ".myFun2.data}}",
        "{{" + jsObjName + ".myFun1.data}}",
      ];

      let foundMatch = false;
      for (let i = 0; i < bindingsLength; i++) {
        const text = $lis.eq(i).text();
        if (expectedTexts.includes(text)) {
          foundMatch = true;
          break;
        }
      }
      expect(foundMatch).to.be.true;
    });
    cy.get(this._bindingsClose).click({ force: true });
  }

  public VerifyAsyncFuncSettings(funName: string, onLoad = true) {
    this.agHelper.GetNClick(this._settingsTab);
    this.agHelper.AssertExistingCheckedState(
      this._onPageLoadSwitchStatus(funName),
      onLoad.toString(),
    );
  }

  public EnableDisableAsyncFuncSettings(funName: string, onLoad = true) {
    // Navigate to Settings tab
    this.agHelper.GetNClick(this._settingsTab);
    // Set onPageLoad
    this.agHelper.CheckUncheck(this._onPageLoadSwitch(funName), onLoad);
    // Return to code tab
    this.agHelper.GetNClick(this._codeTab);
  }

  /**
  There are two types of parse errors in the JS Editor
  1. Parse errors that render the JS Object invalid and all functions unrunnable
  2. Parse errors within functions that throw errors when executing those functions
 */
  public AssertParseError(exists: boolean) {
    const { _jsObjectParseErrorCallout } = this;
    // Assert presence/absence of parse error
    cy.get(_jsObjectParseErrorCallout).should(exists ? "exist" : "not.exist");
  }

  public SelectFunctionDropdown(funName: string) {
    cy.get(this._funcDropdown).click();
    this.agHelper.GetNClickByContains(this._funcDropdownOptions, funName);
  }

  public AssertSelectedFunction(funName: string) {
    cy.get(this._funcDropdownValue).contains(funName).should("exist");
  }

  public ConfirmationClick(type: "Yes" | "No") {
    this.agHelper
      .GetElement(this._confirmationModalBtns(type))
      .eq(0)
      .scrollIntoView()
      .then(($element: any) => {
        cy.get($element).trigger("click", {
          force: true,
        });
      });

    if (type == "Yes")
      this.agHelper.AssertElementAbsence(
        this.locator._specificToast("canceled"),
      ); //Asserting NO is not clicked
  }

  //#endregion
}
