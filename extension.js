import {Extension} from 'resource:///org/gnome/shell/extensions/extension.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';

const LARGE_STEPS = 10;
const ORIGINAL_STEPS = '_bceOriginalNSteps';

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

export default class BrightnessControlEnhancement extends Extension {
    enable() {
        this._manager = Main.brightnessManager;
        this._changedId = 0;

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
        this._manager = null;
    }

    _apply() {
        const manager = this._manager ?? Main.brightnessManager;
        if (!manager)
            return;

        for (const scale of collectScales(manager))
            applyNSteps(scale);
    }

    _restore() {
        const manager = this._manager ?? Main.brightnessManager;
        if (!manager)
            return;

        for (const scale of collectScales(manager))
            restoreNSteps(scale);
    }
}
