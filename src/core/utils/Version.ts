export class Version {
	public version: string;
	public versionMajor: number;
	public versionMinor: number;

	constructor(version: string) {
		this.version = version;
		const vmLength = (version.indexOf('.') === -1) ? version.length : version.indexOf('.');
		this.versionMajor = parseInt(version.substring(0, vmLength), 10);
		const minorStr = version.substring(vmLength + 1);
		this.versionMinor = minorStr.length === 0 ? 0 : parseInt(minorStr, 10);
		if (isNaN(this.versionMinor)) {
			this.versionMinor = 0;
		}
	}

	newerThan(version: string | Version): boolean {
		const v = (version instanceof Version) ? version : new Version(version);

		if (this.versionMajor > v.versionMajor) {
			return true;
		} else if (this.versionMajor === v.versionMajor && this.versionMinor > v.versionMinor) {
			return true;
		} else {
			return false;
		}
	}

	equalOrHigher(version: string | Version): boolean {
		const v = (version instanceof Version) ? version : new Version(version);

		if (this.versionMajor > v.versionMajor) {
			return true;
		} else if (this.versionMajor === v.versionMajor && this.versionMinor >= v.versionMinor) {
			return true;
		} else {
			return false;
		}
	}

	upTo(version: string | Version): boolean {
		return !this.newerThan(version);
	}
}
