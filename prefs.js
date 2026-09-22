import Adw from 'gi://Adw';
import Gio from 'gi://Gio';
import Gtk from 'gi://Gtk';

import {
    ExtensionPreferences,
} from 'resource:///org/gnome/Shell/Extensions/js/extensions/prefs.js';

import {
    COLOR_BUS,
    COLOR_PATH,
    COLOR_SCHEMA,
    ColorProxy,
    getSchedule,
    scheduleLabels,
} from './nightLight.js';

export default class BrightnessControlEnhancementPreferences extends ExtensionPreferences {
    fillPreferencesWindow(window) {
        const settings = this.getSettings();
        const color = new Gio.Settings({schema_id: COLOR_SCHEMA});
        window.default_width = 520;
        window.default_height = 420;

        const page = new Adw.PreferencesPage({
            title: 'General',
            icon_name: 'preferences-system-symbolic',
        });
        window.add(page);

        const group = new Adw.PreferencesGroup({
            title: 'Night Light',
            description: 'Hours come from GNOME Night Light. Change them in Settings → Displays → Night Light.',
        });
        page.add(group);

        const toggle = new Adw.SwitchRow({
            title: 'Night Light',
            subtitle: 'Use a day brightness and a night brightness on GNOME’s schedule.',
        });
        settings.bind('night-light-brightness', toggle, 'active', Gio.SettingsBindFlags.DEFAULT);
        group.add(toggle);

        const nightHours = new Adw.ActionRow({
            title: 'Night',
            subtitle: '—',
            activatable: false,
        });
        nightHours.add_prefix(new Gtk.Image({icon_name: 'weather-clear-night-symbolic'}));
        group.add(nightHours);

        const dayHours = new Adw.ActionRow({
            title: 'Day',
            subtitle: '—',
            activatable: false,
        });
        dayHours.add_prefix(new Gtk.Image({icon_name: 'weather-clear-symbolic'}));
        group.add(dayHours);

        const dayLevel = new Adw.SpinRow({
            title: 'Day brightness',
            subtitle: 'Percent used while it is day.',
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 100,
                step_increment: 10,
                page_increment: 10,
            }),
            digits: 0,
        });
        settings.bind('day-brightness', dayLevel, 'value', Gio.SettingsBindFlags.DEFAULT);
        group.add(dayLevel);

        const nightLevel = new Adw.SpinRow({
            title: 'Night brightness',
            subtitle: 'Percent used while it is night.',
            adjustment: new Gtk.Adjustment({
                lower: 0,
                upper: 100,
                step_increment: 10,
                page_increment: 10,
            }),
            digits: 0,
        });
        settings.bind('night-brightness', nightLevel, 'value', Gio.SettingsBindFlags.DEFAULT);
        group.add(nightLevel);

        let colorProxy = null;

        const sync = () => {
            const on = settings.get_boolean('night-light-brightness');
            dayLevel.visible = on;
            nightLevel.visible = on;

            const {from, to, automatic} = getSchedule(color, colorProxy);
            const labels = scheduleLabels(from, to);
            const source = automatic
                ? 'Sunset to sunrise'
                : 'GNOME Night Light';
            nightHours.subtitle = `${labels.night}  ·  ${source}`;
            dayHours.subtitle = `${labels.day}  ·  ${source}`;
        };

        colorProxy = new ColorProxy(Gio.DBus.session, COLOR_BUS, COLOR_PATH, (_proxy, error) => {
            if (error)
                console.error(`Brightness Control Enhancement: ${error.message}`);
            sync();
        });

        settings.connect('changed::night-light-brightness', sync);
        color.connect('changed', sync);
        colorProxy.connect('g-properties-changed', sync);
        sync();
    }
}
