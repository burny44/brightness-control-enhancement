# Brightness Control Enhancement

A GNOME Shell extension that makes keyboard brightness keys move in **10%** steps instead of GNOME’s default **5%**.

GNOME divides brightness into 20 levels. Enable this extension to use 10 levels instead. Disable it to go back. There is no extra setting.

On login GNOME starts at **45%** (backlight value 100 in the 10–210 range). The extension moves that to **50%** (value 110). That is not full brightness; 100% is still 210. After that, keys move 10% at a time: 40, 50, 60, 70, …

## Requirements

- GNOME Shell **49** or **50**
- A display with hardware backlight control (the built-in brightness keys already work)

This was written against GNOME Shell 50. Keyboard brightness is handled by GNOME’s `BrightnessManager` from Shell 49 onward.

## Install

From this directory:

```bash
chmod +x install.sh
./install.sh
```

That symlinks the extension into `~/.local/share/gnome-shell/extensions/`.

Then reload GNOME Shell:

- **Wayland:** log out and back in
- **X11:** `Alt+F2`, type `r`, press Enter

Enable it:

```bash
gnome-extensions enable brightness-control-enhancement@burny
```

Or use the Extensions app.

## Usage

Turn the extension on. Login brightness becomes 50%. Brightness up/down keys then move 10% per press.

Turn it off to restore GNOME’s 5% steps.

The on-screen brightness indicator still appears as usual.

## How it works

GNOME’s brightness manager uses 20 steps:

```js
const SCALE_VALUE_N_STEPS = 20; // 100% / 20 = 5%
```

While the extension is enabled, login brightness is set to 50% once, and key presses snap to 10% marks. Disabling the extension restores the original step size; the last brightness value is kept.

It does not write to `/sys/class/backlight`, and it does not replace GNOME’s brightness OSD.

## Uninstall

```bash
gnome-extensions disable brightness-control-enhancement@burny
rm -f ~/.local/share/gnome-shell/extensions/brightness-control-enhancement@burny
```

Then reload GNOME Shell as in the install steps.

## License

GPL-3.0-or-later. GNOME Shell extensions that use Shell modules are derivative works of GNOME Shell.
