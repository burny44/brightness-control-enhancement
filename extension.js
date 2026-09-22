import Gio from 'gi://Gio';
import GLib from 'gi://GLib';

import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

import {
    COLOR_BUS,
    COLOR_PATH,
    COLOR_SCHEMA,
    ColorProxy,
    getSchedule,
    isNightTime,
    nextTransitionMs,
} from './nightLight.js';

const LARGE_STEPS = 10;
const GRID = 1 / LARGE_STEPS;
const STARTUP_BRIGHTNESS = 0.50;
const EPSILON = 0.001;
const ORIGINAL_STEPS = '_bceOriginalNSteps';
const ORIG_STEP_UP = '_bceStepUp';
const ORIG_STEP_DOWN = '_bceStepDown';

function collectScales(manager) {
    const scales = [];
    if (manager?.globalScale)
        scales.push(manager.globalScale);
    if (manager?.scales) {
        for (const scale of manager.scales)
            scales.push(scale);
    }
    return scales;
}

function stepUpFrom(value) {
    const idx = Math.floor(value / GRID + EPSILON) + 1;
    return Math.min(1.0, idx * GRID);
}

function stepDownFrom(value) {
    const idx = Math.ceil(value / GRID - EPSILON) - 1;
    return Math.max(0.0, idx * GRID);
}

function applyNSteps(scale) {
    if (typeof scale?._nSteps !== 'number')
        return;

    if (scale[ORIGINAL_STEPS] === undefined)
        scale[ORIGINAL_STEPS] = scale._nSteps;

    scale._nSteps = Math.min(scale[ORIGINAL_STEPS], LARGE_STEPS);
}

function restoreNSteps(scale) {
    if (typeof scale?._nSteps !== 'number')
        return;
    if (scale[ORIGINAL_STEPS] === undefined)
        return;

    scale._nSteps = scale[ORIGINAL_STEPS];
    delete scale[ORIGINAL_STEPS];
}

function patchScale(scale) {
    applyNSteps(scale);

    if (scale[ORIG_STEP_UP])
        return;

    scale[ORIG_STEP_UP] = scale.stepUp.bind(scale);
    scale[ORIG_STEP_DOWN] = scale.stepDown.bind(scale);

    scale.stepUp = () => {
        scale.value = stepUpFrom(scale.value);
    };
    scale.stepDown = () => {
        scale.value = stepDownFrom(scale.value);
    };
}

function unpatchScale(scale) {
    if (scale[ORIG_STEP_UP]) {
        scale.stepUp = scale[ORIG_STEP_UP];
        scale.stepDown = scale[ORIG_STEP_DOWN];
        delete scale[ORIG_STEP_UP];
        delete scale[ORIG_STEP_DOWN];
    }
    restoreNSteps(scale);
}

export default class BrightnessControlEnhancement extends Extension {
    enable() {
        this._settings = this.getSettings();
        this._color = new Gio.Settings({schema_id: COLOR_SCHEMA});
        this._colorProxy = new ColorProxy(Gio.DBus.session, COLOR_BUS, COLOR_PATH,
            (_proxy, error) => {
                if (error) {
                    console.error(`${this.uuid}: ${error.message}`);
                    return;
                }
                this._reschedule();
            });

        this._manager = Main.brightnessManager;
        this._changedId = 0;
        this._timer = 0;
        this._appliedInitial = false;

        if (!this._manager) {
            console.warn(
                `${this.uuid}: GNOME brightness manager is unavailable; ` +
                'this extension needs GNOME 49 or later.'
            );
            return;
        }

        this._changedId = this._manager.connect('changed', () => this._apply());
        this._settings.connectObject(
            'changed::night-light-brightness', () => this._reschedule(),
            'changed::day-brightness', () => this._applyScheduledTarget(),
            'changed::night-brightness', () => this._applyScheduledTarget(),
            this
        );
        this._color.connectObject('changed', () => this._reschedule(), this);
        this._colorProxy.connectObject('g-properties-changed', () => this._reschedule(), this);

        this._apply();
        this._reschedule();
    }

    disable() {
        this._clearTimer();
        this._restore();

        if (this._changedId && this._manager)
            this._manager.disconnect(this._changedId);

        this._settings?.disconnectObject(this);
        this._color?.disconnectObject(this);
        this._colorProxy?.disconnectObject(this);

        this._changedId = 0;
        this._appliedInitial = false;
        this._manager = null;
        this._settings = null;
        this._color = null;
        this._colorProxy = null;
    }

    _apply() {
        const manager = this._manager ?? Main.brightnessManager;
        if (!manager)
            return;

        for (const scale of collectScales(manager))
            patchScale(scale);

        if (!this._appliedInitial && this._applyBrightness(this._targetBrightness()))
            this._appliedInitial = true;
    }

    _usesNightSchedule() {
        return this._settings?.get_boolean('night-light-brightness') ?? false;
    }

    _targetBrightness() {
        if (!this._usesNightSchedule())
            return STARTUP_BRIGHTNESS;

        const {from, to} = getSchedule(this._color, this._colorProxy);
        const percent = isNightTime(from, to)
            ? this._settings.get_int('night-brightness')
            : this._settings.get_int('day-brightness');
        return percent / 100;
    }

    _applyBrightness(target) {
        const manager = this._manager ?? Main.brightnessManager;
        const scale = manager?.globalScale;
        if (!scale || typeof scale.value !== 'number')
            return false;

        if (Math.abs(scale.value - target) > EPSILON)
            scale.value = target;
        return true;
    }

    _applyScheduledTarget() {
        if (!this._usesNightSchedule())
            return;
        this._applyBrightness(this._targetBrightness());
    }

    _reschedule() {
        this._clearTimer();

        if (!this._usesNightSchedule())
            return;

        this._applyScheduledTarget();
        const {from, to} = getSchedule(this._color, this._colorProxy);
        const ms = nextTransitionMs(from, to);
        this._timer = GLib.timeout_add(GLib.PRIORITY_DEFAULT, ms, () => {
            this._timer = 0;
            this._reschedule();
            return GLib.SOURCE_REMOVE;
        });
    }

    _clearTimer() {
        if (this._timer) {
            GLib.source_remove(this._timer);
            this._timer = 0;
        }
    }

    _restore() {
        const manager = this._manager ?? Main.brightnessManager;
        if (!manager)
            return;

        for (const scale of collectScales(manager))
            unpatchScale(scale);
    }
}
