export function semver(str) {
    return +str.replace(/[^\d.]/g,'').split`.`.map((d) => d.padStart(3, '0')).join``;
}
