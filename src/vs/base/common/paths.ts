/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
'use strict';

import {isLinux, isWindows} from 'vs/base/common/platform';

/**
 * The forward slash path separator.
 */
export var sep = '/';

/**
 * The native path separator depending on the OS.
 */
export var nativeSep = isWindows ? '\\' : '/';

export function relative(from: string, to: string): string {

	from = normalize(from);
	to = normalize(to);

	var fromParts = from.split(sep),
		toParts = to.split(sep);

	while (fromParts.length > 0 && toParts.length > 0) {
		if (fromParts[0] === toParts[0]) {
			fromParts.shift();
			toParts.shift();
		} else {
			break;
		}
	}

	for (var i = 0, len = fromParts.length; i < len; i++) {
		toParts.unshift('..');
	}

	return toParts.join(sep);
}

// const _dotSegment = /[\\\/]\.\.?[\\\/]?|[\\\/]?\.\.?[\\\/]/;

// export function normalize(path: string, toOSPath?: boolean): string {

// 	if (!path) {
// 		return path;
// 	}

// 	// a path is already normal if it contains no .. or . parts
// 	// and already uses the proper path separator
// 	if (!_dotSegment.test(path)) {

// 		// badSep is the path separator we don't want. Usually
// 		// the backslash, unless isWindows && toOSPath
// 		let badSep = toOSPath && isWindows ? '/' : '\\';
// 		if (path.indexOf(badSep) === -1) {
// 			return path;
// 		}
// 	}

// 	let parts = path.split(/[\\\/]/);
// 	for (let i = 0, len = parts.length; i < len; i++) {
// 		if (parts[i] === '.' && (parts[i + 1] || parts[i - 1])) {
// 			parts.splice(i, 1);
// 			i -= 1;
// 		} else if (parts[i] === '..' && !!parts[i - 1]) {
// 			parts.splice(i - 1, 2);
// 			i -= 2;
// 		}
// 	}

// 	return parts.join(toOSPath ? nativeSep : sep);
// }

export function normalize(path: string, toOSPath?: boolean): string {

	if (path === null || path === void 0) {
		return path;
	}

	let len = path.length;
	if (len === 0) {
		return '.';
	}

	const sep = isWindows && toOSPath ? '\\' : '/';
	const root = getRoot(path, sep);

	// operate on the 'path-portion' only
	path = path.slice(root.length);
	let res = '';
	let start = 0;

	for (let end = 0; end <= len; end++) {
		let code = path.charCodeAt(end);
		if (code === _slash || code === _backslash || end === len) {

			let part = path.slice(start, end);
			start = end + 1;

			if (part === '.' && (root || res || end < len - 1)) {
				// skip current (if there is already something or if there is more to come)
				continue;
			}

			if (part === '..') {
				// skip current and remove parent (if there is already something)
				let prev_start = res.lastIndexOf(sep);
				let prev_part = res.slice(prev_start + 1);
				if ((root || prev_part.length > 0) && prev_part !== '..') {
					res = prev_start === -1 ? '' : res.slice(0, prev_start);
					continue;
				}
			}

			if (res !== '' && res[res.length - 1] !== sep) {
				res += sep;
			}
			res += part;
		}
	}

	return root + res;
}

/**
 * @returns the directory name of a path.
 */
export function dirname(path: string): string {
	var idx = ~path.lastIndexOf('/') || ~path.lastIndexOf('\\');
	if (idx === 0) {
		return '.';
	} else if (~idx === 0) {
		return path[0];
	} else {
		return path.substring(0, ~idx);
	}
}

/**
 * @returns the base name of a path.
 */
export function basename(path: string): string {
	var idx = ~path.lastIndexOf('/') || ~path.lastIndexOf('\\');
	if (idx === 0) {
		return path;
	} else if (~idx === path.length - 1) {
		return basename(path.substring(0, path.length - 1));
	} else {
		return path.substr(~idx + 1);
	}
}

/**
 * @returns {{.far}} from boo.far or the empty string.
 */
export function extname(path: string): string {
	path = basename(path);
	var idx = ~path.lastIndexOf('.');
	return idx ? path.substring(~idx) : '';
}

enum PathType {
	Unc, // \\server\shares\somepath
	Uri, // scheme://authority/somepath
	Drive, // windows drive letter path
	Path // posix path OR windows current drive root relative
}

/**
 * Return the length of the denoting part of this path, like `c:\files === 3 (c:\)`,
 * `files:///files/path === 8 (files:///)`, or `\\server\shares\path === 16 (\\server\shares\)`
 */
export function getRoot(path: string, sep: string = '/'): string {

	if (!path) {
		return '';
	}

	let len = path.length;
	let code = path.charCodeAt(0);
	if (code === _slash || code === _backslash) {

		code = path.charCodeAt(1);
		if (code === _slash || code === _backslash) {
			// UNC candidate \\localhost\shares\ddd
			//               ^^^^^^^^^^^^^^^^^^^
			code = path.charCodeAt(2);
			if (code !== _slash && code !== _backslash) {
				let pos = 3;
				let start = pos;
				for (; pos < len; pos++) {
					code = path.charCodeAt(pos);
					if (code === _slash || code === _backslash) {
						break;
					}
				}
				code = path.charCodeAt(pos + 1);
				if (start !== pos && code !== _slash && code !== _backslash) {
					pos += 1;
					for (; pos < len; pos++) {
						code = path.charCodeAt(pos);
						if (code === _slash || code === _backslash) {
							return path.slice(0, pos + 1).replace(/[\\/]/g, sep); // consume this separator
						}
					}
				}
			}
		}

		// /user/far
		// ^
		return sep;

	} else if ((code >= _A && code <= _Z) || (code >= _a && code <= _z)) {
		// check for windows drive letter c:\ or c:

		if (path.charCodeAt(1) === _colon) {
			code = path.charCodeAt(2);
			if (code === _slash || code === _backslash) {
				// C:\fff
				// ^^^
				return path.slice(0, 2) + sep;
			} else {
				// C:
				// ^^
				return path.slice(0, 2);
			}
		}
	}

	// check for URI
	// scheme://authority/path
	// ^^^^^^^^^^^^^^^^^^^
	let pos = path.indexOf('://');
	if (pos !== -1) {
		pos += 3; // 3 -> "://".length
		for (; pos < len; pos++) {
			code = path.charCodeAt(pos);
			if (code === _slash || code === _backslash) {
				return path.slice(0, pos + 1); // consume this separator
			}
		}
	}

	return '';
}

export function join(...parts: string[]): string {

	var rootLen = getRoot(parts[0]).length,
		root: string;

	// simply preserve things like c:/, //localhost/, file:///, http://, etc
	root = parts[0].substr(0, rootLen);
	parts[0] = parts[0].substr(rootLen);

	var allParts: string[] = [],
		endsWithSep = /[\\\/]$/.test(parts[parts.length - 1]);

	for (var i = 0; i < parts.length; i++) {
		allParts.push.apply(allParts, parts[i].split(/\/|\\/));
	}

	for (var i = 0; i < allParts.length; i++) {
		var part = allParts[i];
		if (part === '.' || part.length === 0) {
			allParts.splice(i, 1);
			i -= 1;
		} else if (part === '..' && !!allParts[i - 1] && allParts[i - 1] !== '..') {
			allParts.splice(i - 1, 2);
			i -= 2;
		}
	}

	if (endsWithSep) {
		allParts.push('');
	}

	var ret = allParts.join('/');
	if (root) {
		ret = root.replace(/\/|\\/g, '/') + ret;
	}

	return ret;
}

export function isUNC(path: string): boolean {
	if (!isWindows || !path) {
		return false; // UNC is a windows concept
	}

	path = this.normalize(path, true);

	return path[0] === nativeSep && path[1] === nativeSep;
}

function isPosixAbsolute(path: string): boolean {
	return path && path[0] === '/';
}

export function makeAbsolute(path: string, isPathNormalized?: boolean): string {
	return isPosixAbsolute(!isPathNormalized ? normalize(path) : path) ? path : sep + path;
}

export function isRelative(path: string): boolean {
	return path && path.length > 1 && path[0] === '.';
}

const _slash = '/'.charCodeAt(0);
const _backslash = '\\'.charCodeAt(0);
const _colon = ':'.charCodeAt(0);
const _a = 'a'.charCodeAt(0);
const _A = 'A'.charCodeAt(0);
const _z = 'z'.charCodeAt(0);
const _Z = 'Z'.charCodeAt(0);

export function isEqualOrParent(path: string, candidate: string): boolean {

	if (path === candidate) {
		return true;
	}

	path = normalize(path);
	candidate = normalize(candidate);

	let candidateLen = candidate.length;
	let lastCandidateChar = candidate.charCodeAt(candidateLen - 1);
	if (lastCandidateChar === _slash) {
		candidate = candidate.substring(0, candidateLen - 1);
		candidateLen -= 1;
	}

	if (path === candidate) {
		return true;
	}

	if (!isLinux) {
		// case insensitive
		path = path.toLowerCase();
		candidate = candidate.toLowerCase();
	}

	if (path === candidate) {
		return true;
	}

	if (path.indexOf(candidate) !== 0) {
		return false;
	}

	let char = path.charCodeAt(candidateLen);
	return char === _slash;
}

// Reference: https://en.wikipedia.org/wiki/Filename
const INVALID_FILE_CHARS = isWindows ? /[\\/:\*\?"<>\|]/g : /[\\/]/g;
const WINDOWS_FORBIDDEN_NAMES = /^(con|prn|aux|clock\$|nul|lpt[0-9]|com[0-9])$/i;
export function isValidBasename(name: string): boolean {
	if (!name || name.length === 0 || /^\s+$/.test(name)) {
		return false; // require a name that is not just whitespace
	}

	INVALID_FILE_CHARS.lastIndex = 0; // the holy grail of software development
	if (INVALID_FILE_CHARS.test(name)) {
		return false; // check for certain invalid file characters
	}

	if (isWindows && WINDOWS_FORBIDDEN_NAMES.test(name)) {
		return false; // check for certain invalid file names
	}

	if (name === '.' || name === '..') {
		return false; // check for reserved values
	}

	if (isWindows && name[name.length - 1] === '.') {
		return false; // Windows: file cannot end with a "."
	}

	if (isWindows && name.length !== name.trim().length) {
		return false; // Windows: file cannot end with a whitespace
	}

	return true;
}

export const isAbsoluteRegex = /^((\/|[a-zA-Z]:\\)[^\(\)<>\\'\"\[\]]+)/;

/**
 * If you have access to node, it is recommended to use node's path.isAbsolute().
 * This is a simple regex based approach.
 */
export function isAbsolute(path: string): boolean {
	return isAbsoluteRegex.test(path);
}
