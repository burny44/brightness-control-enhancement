import Gio from 'gi://Gio';

export const COLOR_SCHEMA = 'org.gnome.settings-daemon.plugins.color';
export const COLOR_BUS = 'org.gnome.SettingsDaemon.Color';
export const COLOR_PATH = '/org/gnome/SettingsDaemon/Color';

const ColorInterface = `
<node>
  <interface name="org.gnome.SettingsDaemon.Color">
    <property name="NightLightActive" type="b" access="read"/>
    <property name="Sunrise" type="d" access="read"/>
    <property name="Sunset" type="d" access="read"/>
  </interface>
</node>`;

export const ColorProxy = Gio.DBusProxy.makeProxyWrapper(ColorInterface);

export function formatHour(value) {
    const total = Math.round(Number(value) * 60);
    const hours = ((Math.floor(total / 60) % 24) + 24) % 24;
    const minutes = ((total % 60) + 60) % 60;
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function currentHours(date = new Date()) {
    return date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600;
}

export function isNightTime(from, to, date = new Date()) {
    const now = currentHours(date);
    if (from === to)
        return false;
    if (from < to)
        return now >= from && now < to;
    return now >= from || now < to;
}

export function nextTransitionMs(from, to, date = new Date()) {
    const now = currentHours(date);
    const deltas = [from, to].map(hour => {
        let delta = hour - now;
        if (delta <= 0)
            delta += 24;
        return delta * 3600 * 1000;
    });
    return Math.max(1000, Math.round(Math.min(...deltas)));
}

export function getSchedule(colorSettings, colorProxy) {
    const automatic = colorSettings.get_boolean('night-light-schedule-automatic');
    let from = colorSettings.get_double('night-light-schedule-from');
    let to = colorSettings.get_double('night-light-schedule-to');

    if (automatic && colorProxy) {
        const sunset = colorProxy.Sunset;
        const sunrise = colorProxy.Sunrise;
        if (sunset >= 0 && sunrise >= 0) {
            from = sunset;
            to = sunrise;
        }
    }

    return {from, to, automatic};
}

export function scheduleLabels(from, to) {
    return {
        night: `${formatHour(from)} – ${formatHour(to)}`,
        day: `${formatHour(to)} – ${formatHour(from)}`,
    };
}
