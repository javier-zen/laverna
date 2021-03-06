/*global define*/
define([
    'underscore',
    'app',
    'marionette',
    'collections/configs',
    'models/config',
    'apps/settings/show/showView',
    'fileSaver'
], function (_, App, Marionette, Configs, Config, View, saveAs) {
    'use strict';

    var Show = App.module('AppSettings.Show');

    /**
     * Settings controller
     */
    Show.Controller = Marionette.Controller.extend({
        initialize: function () {
            _.bindAll(this, 'show');

            this.configs = new Configs();
            this.configs.fetch();

            // Events
            this.configs.on('changeSetting', this.save, this);
        },

        // Show settings form in modal window
        // ---------------------------------
        show : function () {
            var view = new View({ collection : this.configs });
            App.modal.show(view);

            view.on('redirect', this.redirect, this);
            view.on('import', this.importSettings, this);
            view.on('export', this.exportSettings, this);
        },

        // Export all settings
        // -------------------
        exportSettings: function () {
            var blob = new Blob(
                [JSON.stringify( this.configs )],
                {type: 'text/plain;charset=utf-8'}
            );

            saveAs(blob, 'laverna-settings.json');
        },

        // Import settings (encryption settings, hashes etc..)
        // -----------------------------
        importSettings: function (data) {
            var reader = new FileReader(),
                self = this,
                settings;

            if (data.length === 0) {
                return;
            }

            reader.onload = function (event) {
                try {
                    settings = JSON.parse(event.target.result);
                    settings = _.extend(settings, {'appVersion' : App.constants.VERSION});

                    _.each(settings, function (conf, iter) {
                        self.save(conf);

                        if (iter === settings.length-1) {
                            self.redirect(['']);
                        }
                    });
                }
                catch (error) {
                    throw new Error('File chould be in json format');
                }
            };

            reader.readAsText(data.files[0]);
        },

        // Save new settings
        // ----------------------
        save: function (setting) {
            var model = this.configs.get(setting.name);

            if (model) {
                model.save({ value : setting.value });
            }
        },

        // Navivate back and reload the page
        // ---------------------------------
        redirect: function (changedSettings) {
            App.modal.close();

            if ( this.isEncryptionChanged(changedSettings) === false) {
                App.navigate('/notes', {trigger : false});

                if (changedSettings && changedSettings.length !== 0) {
                    window.location.reload();
                }
            } else {
                App.log('One of encryption\'s settings is changed');
                App.navigate('/encrypt/all', true);
            }
        },

        // Check is any of encryption settings is changed
        // -------------------------------
        isEncryptionChanged: function (changedSettings) {
            var encrSet = ['encrypt', 'encryptPass', 'encryptSalt', 'encryptIter', 'encryptTag', 'encryptKeySize'],
                encrypt = parseInt(this.configs.get('encrypt').get('value')),
                changed = false;

            _.each(encrSet, function (set) {
                if (_.contains(changedSettings, set) === true) {
                    changed = true;
                }
            });

            if (encrypt === App.settings.encrypt && encrypt === 0) {
                changed = false;
            }

            return changed;
        }

    });

    return Show.Controller;
});
