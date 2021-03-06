/// <reference path="../../js/jquery.d.ts" />
/// <reference path="../../js/extensions.d.ts" />

import baseExtension = require("../../modules/coreplayer-shared-module/baseExtension");
import coreExtension = require("../coreplayer-seadragon-extension/extension");
import utils = require("../../utils");
import baseProvider = require("../../modules/coreplayer-shared-module/baseProvider");
import provider = require("./provider");
import shell = require("../../modules/coreplayer-shared-module/shell");
import header = require("../../modules/coreplayer-pagingheaderpanel-module/pagingHeaderPanel");
import left = require("../../modules/wellcomeplayer-treeviewleftpanel-module/treeViewLeftPanel");
import right = require("../../modules/wellcomeplayer-moreinforightpanel-module/moreInfoRightPanel");
import footer = require("../../modules/wellcomeplayer-searchfooterpanel-module/footerPanel");
import login = require("../../modules/wellcomeplayer-dialogues-module/loginDialogue");
import restrictedFile = require("../../modules/wellcomeplayer-dialogues-module/restrictedFileDialogue");
import conditions = require("../../modules/wellcomeplayer-dialogues-module/conditionsDialogue");
import download = require("../../modules/wellcomeplayer-dialogues-module/downloadDialogue");
import center = require("../../modules/wellcomeplayer-seadragoncenterpanel-module/seadragonCenterPanel");
import embed = require("../../extensions/coreplayer-seadragon-extension/embedDialogue");
import help = require("../../modules/coreplayer-dialogues-module/helpDialogue");
import IWellcomeExtension = require("../../modules/wellcomeplayer-shared-module/iWellcomeExtension");
import sharedBehaviours = require("../../modules/wellcomeplayer-shared-module/behaviours");
import IProvider = require("../../modules/coreplayer-shared-module/iProvider");
import ISeadragonProvider = require("../coreplayer-seadragon-extension/iSeadragonProvider");
import IWellcomeProvider = require("../../modules/wellcomeplayer-shared-module/iWellcomeProvider");
import IWellcomeSeadragonProvider = require("./iWellcomeSeadragonProvider");
import IWellcomeSeadragonExtension = require("./iWellcomeSeadragonExtension");

export class Extension extends coreExtension.Extension implements IWellcomeSeadragonExtension{

    $conditionsDialogue: JQuery;
    conditionsDialogue: conditions.ConditionsDialogue;
    $loginDialogue: JQuery;
    loginDialogue: login.LoginDialogue;
    $restrictedFileDialogue: JQuery;
    restrictedFileDialogue: restrictedFile.RestrictedFileDialogue;
    $downloadDialogue: JQuery;
    downloadDialogue: download.DownloadDialogue;
    $helpDialogue: JQuery;
    helpDialogue: help.HelpDialogue;

    searchResults: any;

    static SEARCH_RESULTS: string = 'onSearchResults';
    static SEARCH_RESULTS_EMPTY: string = 'onSearchResults';
    static SAVE: string = 'onSave';
    static CURRENT_VIEW_URI: string = 'onCurrentViewUri';

    behaviours: sharedBehaviours;

    constructor(provider: IProvider) {
        this.behaviours = new sharedBehaviours(this);

        super(provider);
    }

    create(): void {
        super.create();

        // track unload
        $(window).bind('unload', () => {
            //this.trackEvent("Documents", "Unloaded");
            $.publish(baseExtension.BaseExtension.WINDOW_UNLOAD);
        });

        $.subscribe(center.SeadragonCenterPanel.SEADRAGON_ANIMATION_FINISH, (e, viewer) => {
            this.triggerSocket(Extension.CURRENT_VIEW_URI,
                {
                    "cropUri": this.getCropUri(false),
                    "fullUri": (<IWellcomeSeadragonProvider>this.provider).getImage(this.provider.getCurrentCanvas(), false, false)
                });
        });

        $.subscribe(footer.FooterPanel.VIEW_PAGE, (e, index: number) => {
            this.viewPage(index);
        });

        $.subscribe(footer.FooterPanel.SEARCH, (e, terms: string) => {
            this.triggerSocket(footer.FooterPanel.SEARCH, terms);
            this.search(terms);
        });

        $.subscribe(footer.FooterPanel.NEXT_SEARCH_RESULT, () => {
            this.nextSearchResult();
        });

        $.subscribe(footer.FooterPanel.PREV_SEARCH_RESULT, () => {
            this.prevSearchResult();
        });

        $.subscribe(footer.FooterPanel.SAVE, (e) => {
            if (this.isFullScreen) {
                $.publish(baseExtension.BaseExtension.TOGGLE_FULLSCREEN);
            }
            this.save();
        });

        $.subscribe(footer.FooterPanel.DOWNLOAD, (e) => {
            $.publish(download.DownloadDialogue.SHOW_DOWNLOAD_DIALOGUE);
        });

        $.subscribe(login.LoginDialogue.LOGIN, (e, params: any) => {
            this.login(params);
        });


        $.subscribe(login.LoginDialogue.NEXT_ITEM, (e, requestedIndex: number) => {
            this.viewNextAvailableIndex(requestedIndex, (nextAvailableIndex: number) => {
                this.viewPage(nextAvailableIndex);
            });
        });

        $.subscribe(restrictedFile.RestrictedFileDialogue.NEXT_ITEM, (e, requestedIndex: number) => {
            this.viewNextAvailableIndex(requestedIndex, (nextAvailableIndex: number) => {
                this.viewPage(nextAvailableIndex);
            });
        });

        $.subscribe(Extension.CANVAS_INDEX_CHANGED, (e, index: number) => {
            this.triggerSocket(Extension.CANVAS_INDEX_CHANGED, index);
        });
    }

    createModules(): void{
        this.headerPanel = new header.PagingHeaderPanel(shell.Shell.$headerPanel);

        if (this.isLeftPanelEnabled()){
            this.leftPanel = new left.TreeViewLeftPanel(shell.Shell.$leftPanel);
        }

        this.centerPanel = new center.SeadragonCenterPanel(shell.Shell.$centerPanel);
        this.rightPanel = new right.MoreInfoRightPanel(shell.Shell.$rightPanel);
        this.footerPanel = new footer.FooterPanel(shell.Shell.$footerPanel);

        this.$conditionsDialogue = utils.Utils.createDiv('overlay conditions');
        shell.Shell.$overlays.append(this.$conditionsDialogue);
        this.conditionsDialogue = new conditions.ConditionsDialogue(this.$conditionsDialogue);

        this.$loginDialogue = utils.Utils.createDiv('overlay login');
        shell.Shell.$overlays.append(this.$loginDialogue);
        this.loginDialogue = new login.LoginDialogue(this.$loginDialogue);

        this.$restrictedFileDialogue = utils.Utils.createDiv('overlay restrictedFile');
        shell.Shell.$overlays.append(this.$restrictedFileDialogue);
        this.restrictedFileDialogue = new restrictedFile.RestrictedFileDialogue(this.$restrictedFileDialogue);

        this.$embedDialogue = utils.Utils.createDiv('overlay embed');
        shell.Shell.$overlays.append(this.$embedDialogue);
        this.embedDialogue = new embed.EmbedDialogue(this.$embedDialogue);

        this.$downloadDialogue = utils.Utils.createDiv('overlay download');
        shell.Shell.$overlays.append(this.$downloadDialogue);
        this.downloadDialogue = new download.DownloadDialogue(this.$downloadDialogue);

        this.$helpDialogue = utils.Utils.createDiv('overlay help');
        shell.Shell.$overlays.append(this.$helpDialogue);
        this.helpDialogue = new help.HelpDialogue(this.$helpDialogue);

        if (this.isLeftPanelEnabled()){
            this.leftPanel.init();
        }
    }

    search(terms) {

        var searchUri = (<IWellcomeSeadragonProvider>this.provider).getSearchUri(terms);

        var that = this;

        $.getJSON(searchUri, (results) => {
            if (results.length) {
                that.searchResults = results;

                $.publish(Extension.SEARCH_RESULTS, [terms, results]);

                // reload current index as it may contain results.
                that.viewPage(that.provider.canvasIndex);
            } else {
                that.showDialogue(that.provider.config.modules.genericDialogue.content.noMatches, () => {
                    $.publish(Extension.SEARCH_RESULTS_EMPTY);
                });
            }
        });
    }

    clearSearch() {
        this.searchResults = null;

        // reload current index as it may contain results.
        this.viewPage(this.provider.canvasIndex);
    }

    prevSearchResult() {

        // get the first result with an index less than the current index.
        for (var i = this.searchResults.length - 1; i >= 0; i--) {
            var result = this.searchResults[i];

            if (result.index < this.provider.canvasIndex) {
                this.viewPage(result.index);
                break;
            }
        }
    }

    nextSearchResult() {

        // get the first result with an index greater than the current index.
        for (var i = 0; i < this.searchResults.length; i++) {
            var result = this.searchResults[i];

            if (result.index > this.provider.canvasIndex) {
                this.viewPage(result.index);
                break;
            }
        }
    }

    viewPage(canvasIndex: number){

        // authorise.
        this.viewIndex(canvasIndex, () => {

            // successfully authorised. prefetch asset.
            this.prefetchAsset(canvasIndex, () => {

                // successfully prefetched.

                var asset = this.provider.sequence.assets[canvasIndex];

                var dziUri = (<ISeadragonProvider>this.provider).getImageUri(asset);

                $.publish(Extension.OPEN_MEDIA, [dziUri]);

                this.setParam(baseProvider.params.canvasIndex, canvasIndex);

                // todo: add this to more general trackEvent
                this.updateSlidingExpiration();
            });

        });
    }

    save(): void {

        if (!this.isLoggedIn()) {
            this.showLoginDialogue({
                successCallback: () => {
                    this.save();
                },
                failureCallback: (message: string) => {
                    this.showDialogue(message, () => {
                        this.save();
                    });
                },
                allowClose: true,
                message: this.provider.config.modules.genericDialogue.content.loginToSave
            });
        } else if (this.isGuest()){
            this.showLoginDialogue({
                successCallback: () => {
                    this.save();
                },
                failureCallback: (message: string) => {
                    this.showDialogue(message, () => {
                        this.save();
                    });
                },
                allowClose: true,
                allowSocialLogin: true
            });
        } else {
            var path = (<IWellcomeProvider>this.provider).getSaveUri();
            var thumbnail = this.getCropUri(true);
            var title = this.provider.getTitle();
            var asset = this.provider.getCurrentCanvas();
            var label = asset.orderLabel;

            var info = (<IWellcomeSeadragonProvider>this.provider).getSaveInfo(path, thumbnail, title, this.provider.canvasIndex, label);
            this.triggerSocket(Extension.SAVE, info);
        }
    }

    getViewer() {
        return this.centerPanel.viewer;
    }

    getCropUri(relative: boolean): string {
        var page = this.provider.getCurrentCanvas();
        var viewer = this.getViewer();
        return (<IWellcomeSeadragonProvider>this.provider).getCrop(page, viewer, false, relative);
    }

    setParams(): void{
        if (!this.provider.isHomeDomain) return;

        // check if there are legacy params and reformat.
        // if the string isn't empty and doesn't contain a ? sign it's a legacy hash.
        var hash = parent.document.location.hash;

        if (hash != '' && !hash.contains('?')){
            // split params on '/'.
            if (hash.startsWith('#/')) hash = hash.replace('#/', '#');
            var params = hash.replace('#', '').split('/');

            // reset hash to empty.
            parent.document.location.hash = '';

            // sequenceIndex
            if (params[0]){
                this.setParam(baseProvider.params.sequenceIndex, this.provider.sequenceIndex);
            }

            // canvasIndex
            if (params[1]){
                this.setParam(baseProvider.params.canvasIndex, params[1]);
            }

            // zoom or search
            if (params[2]){

                if (params[2].indexOf('=') != -1){
                    // it's a search param.
                    var a = params[2].split('=');

                    utils.Utils.setHashParameter(a[0], a[1], parent.document);
                } else {
                    this.setParam(baseProvider.params.zoom, params[2]);
                }
            }

            // search
            if (params[3]){
                var s = params[3];

                // split into key/val.
                var a = s.split('=');

                utils.Utils.setHashParameter(a[0], a[1], parent.document);
            }
        } else {
            // set sequenceIndex hash param.
            this.setParam(baseProvider.params.sequenceIndex, this.provider.sequenceIndex);
        }
    }

    // everything from here down is common to wellcomplayer extensions.

    viewIndex(canvasIndex: number, successCallback?: any): void {
        this.behaviours.viewIndex(canvasIndex, successCallback);
    }

    // ensures that a file is in the server cache.
    prefetchAsset(canvasIndex: number, successCallback: any): void{
        this.behaviours.prefetchAsset(canvasIndex, successCallback);
    }

    authorise(canvasIndex: number, successCallback: any, failureCallback: any): void {
        this.behaviours.authorise(canvasIndex, successCallback, failureCallback);
    }

    login(params: any): void {
        this.behaviours.login(params);
    }

    viewNextAvailableIndex(requestedIndex: number, callback: any): void {
        this.behaviours.viewNextAvailableIndex(requestedIndex, callback);
    }

    // pass direction as 1 or -1.
    nextAvailableIndex(direction: number, requestedIndex: number): number {
        return this.behaviours.nextAvailableIndex(direction, requestedIndex);
    }

    showLoginDialogue(params): void {
        this.behaviours.showLoginDialogue(params);
    }

    isLoggedIn(): boolean {
        return this.behaviours.isLoggedIn();
    }

    isGuest(): boolean {
        return this.behaviours.isGuest();
    }

    hasPermissionToViewCurrentItem(): boolean{
        return this.behaviours.hasPermissionToViewCurrentItem();
    }

    isAuthorised(canvasIndex): boolean {
        return this.behaviours.isAuthorised(canvasIndex);
    }

    showRestrictedFileDialogue(params): void {
        this.behaviours.showRestrictedFileDialogue(params);
    }

    getInadequatePermissionsMessage(canvasIndex): string {
        return this.behaviours.getInadequatePermissionsMessage(canvasIndex);
    }

    allowCloseLogin(): boolean {
        return this.behaviours.allowCloseLogin();
    }

    updateSlidingExpiration(): void {
        this.behaviours.updateSlidingExpiration();
    }

    trackEvent(category: string, action: string, label: string, value: string): void {
        this.behaviours.trackEvent(category, action, label, value);
    }

    trackVariable(slot: number, name: string, value: string, scope: number): void{
        this.behaviours.trackVariable(slot, name, value, scope);
    }

    isEmbedEnabled(): boolean {
        return this.behaviours.isEmbedEnabled();
    }

    isSaveToLightboxEnabled(): boolean {
        return this.behaviours.isSaveToLightboxEnabled();
    }

    isDownloadEnabled(): boolean {
        return this.behaviours.isDownloadEnabled();
    }
}
