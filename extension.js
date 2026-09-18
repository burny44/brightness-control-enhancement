import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

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
        this._manager = Main.brightnessManager;
        this._changedId = 0;
        this._setStartup = false;

        if (!this._manager) {
            console.warn(
                `${this.uuid}: GNOME brightness manager is unavailable; ` +
                'this extension needs GNOME 49 or later.'
            );
            return;
        }

        this._changedId = this._manager.connect('changed', () => this._apply());
        this._apply();
    }

    disable() {
        this._restore();

        if (this._changedId && this._manager)
            this._manager.disconnect(this._changedId);

        this._changedId = 0;
        this._setStartup = false;
        this._manager = null;
    }

    _apply() {
        const manager = this._manager ?? Main.brightnessManager;
        if (!manager)
            return;

        for (const scale of collectScales(manager))
            patchScale(scale);

        this._applyStartupBrightness(manager);
    }

    _applyStartupBrightness(manager) {
        if (this._setStartup)
            return;

        const scale = manager.globalScale;
        if (!scale || typeof scale.value !== 'number')
            return;

        this._setStartup = true;
        if (Math.abs(scale.value - STARTUP_BRIGHTNESS) > EPSILON)
            scale.value = STARTUP_BRIGHTNESS;
    }

    _restore() {
        const manager = this._manager ?? Main.brightnessManager;
        if (!manager)
            return;

        for (const scale of collectScales(manager))
            unpatchScale(scale);
    }
}
