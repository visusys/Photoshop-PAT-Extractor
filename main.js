"use strict";
exports.__esModule = true;
exports.PatParser = void 0;
var fs_1 = require("fs");
var buffer_1 = require("buffer");
var pngjs_1 = require("pngjs");
var fs = require("fs");
var DWORD = 4;
var WORD = 2;
var BYTE = 1;
var UUIDLength = 37;
var PatParser = /** @class */ (function () {
    function PatParser() {
        this.ofs = 0;
        this.buf = null;
        this.res = {
            correctMagicBytes: null,
            numberOfPatterns: null,
            patterns: null,
            version: null
        };
        this.tempLast = {
            patternItem: null,
            vma: null,
            vmaOffset: null,
            vmaSegmentLength: null,
            channel: null,
            vmaSegmentEnd: null
        };
    }
    PatParser.prototype.saveImages = function (output_dir, rename, rename_base) {
        // https://www.npmjs.com/package/pngjs
        this.res.patterns.forEach(function (item, patternIndex) {
            var _a, _b, _c, _d, _e, _f;
            var hasAlpha = item.hasAlphaChannel ? 1 : 0;
            var rgb = buffer_1.Buffer.alloc(item.width * item.height * (3 + hasAlpha));
            if (item.colorMode === "RGB") {
                var r = item.memoryList.channels[0].rawData;
                var g = item.memoryList.channels[1].rawData;
                var b = item.memoryList.channels[2].rawData;
                var alpha = (_b = (_a = item.memoryList.channels) === null || _a === void 0 ? void 0 : _a[3]) === null || _b === void 0 ? void 0 : _b.rawData;
                for (var i = 0, j = 0, len = r.length; i < len; i++, j += (3 + hasAlpha)) {
                    rgb[j] = r[i];
                    rgb[j + 1] = g[i];
                    rgb[j + 2] = b[i];
                    if (hasAlpha) {
                        rgb[j + 3] = alpha[i];
                    }
                }
            }
            else if (item.colorMode === "INDEXED") {
                // 8 bit RGB table only
                var table = item.table;
                var index = item.memoryList.channels[0].rawData;
                for (var k = 0, l = 0, len = index.length; k < len; k += 1, l += 3) {
                    rgb[l] = table[index[k] * 3];
                    rgb[l + 1] = table[index[k] * 3 + 1];
                    rgb[l + 2] = table[index[k] * 3 + 2];
                }
            }
            else if (item.colorMode === "GRAYSCALE") {
                var gray = item.memoryList.channels[0].rawData;
                var alpha = (_d = (_c = item.memoryList.channels) === null || _c === void 0 ? void 0 : _c[1]) === null || _d === void 0 ? void 0 : _d.rawData;
                for (var i = 0, j = 0, len = gray.length; i < len; i++, j += (3 + hasAlpha)) {
                    rgb[j] = gray[i];
                    rgb[j + 1] = gray[i];
                    rgb[j + 2] = gray[i];
                    if (hasAlpha) {
                        rgb[j + 3] = alpha[i];
                    }
                }
            }
            /*const r = Buffer.alloc(rgb.length).fill(0);
            const g = Buffer.alloc(rgb.length).fill(0);
            const b = Buffer.alloc(rgb.length).fill(0);
            const a = Buffer.alloc(rgb.length).fill(0);
            for (let i = 0,j=0, len = rgb.length; i < len; i += (3 + hasAlpha),j+=3) {
                r[j] = rgb[i];
                g[j + 1] = rgb[i + 1];
                b[j + 2] = rgb[i + 2];
                if (hasAlpha) {
                    a[j] = rgb[i + 3]
                    a[j + 1] = rgb[i + 3]
                    a[j + 2] = rgb[i + 3]
                }
            };*/
            var channels = { /* r, g, b, a,*/ all: rgb };
            /*if (hasAlpha) {
                channels.a = a;
            }*/
            for (var key in channels) {
                if (channels.hasOwnProperty(key) && channels[key]) {
                    var png = new pngjs_1.PNG({ width: item.width, height: item.height });
                    png.data = channels[key];
                    var inputColorType = key === "all" && item.hasAlphaChannel ? 6 : 2;
                    var result = pngjs_1.PNG.sync.write(png, { inputHasAlpha: item.hasAlphaChannel, bitDepth: 8, inputColorType: inputColorType });
                    item.name = item.name.replace(/\s+$/, '');

                    var pindex = patternIndex + 1;
                    pindex = ('00'+pindex).slice(-2);

                    rename_base = rename_base.replace(/[^a-zA-Z0-9]/g,' ');

                    /* fs.writeFileSync(output_dir + "pat" + "_" + patternIndex + "_" + item.name + "_" + ((_e = item.memoryList.channels[0]) === null || _e === void 0 ? void 0 : _e.compressionMode) + "_" + ((_f = item.memoryList.channels[0]) === null || _f === void 0 ? void 0 : _f.pixelDepth) + "_" + "alpha-" + item.hasAlphaChannel + "_" + item.colorMode + "_.png", result, { encoding: "binary" }); */                 
                    if(rename == "false"){
                        fs.writeFileSync(output_dir + pindex + "_" + item.name + ".png", result, { encoding: "binary" });
                    }else{
                        fs.writeFileSync(output_dir + rename_base + " " + pindex + ".png", result, { encoding: "binary" });
                    }
                }
            }
        });
    };
    PatParser.prototype.decodeFile = function (arg) {
        if (typeof arg === "string") {
            this.buf = (0, fs_1.readFileSync)(arg);
        }
        else {
            this.buf = arg;
        }
        var res = this.res;
        this.verifyMagicBytes();
        res.version = this.readUInt16(); // ?
        res.numberOfPatterns = this.readUInt32();
        res.patterns = new Array(res.numberOfPatterns);
        for (var i = 0; i < res.numberOfPatterns; i++) {
            res.patterns[i] = this.decodePatternItem();
        }
        return res;
    };
    PatParser.prototype.verifyMagicBytes = function () {
        var magic = this.buf.toString("ascii", this.ofs, this.ofs + DWORD);
        this.ofs += DWORD;
        this.res.correctMagicBytes = magic === "8BPT";
    };
    PatParser.prototype.decodePatternItem = function () {
        var item = {
            version: this.readUInt32(),
            colorMode: this.readColorMode(),
            height: this.readUInt16(),
            width: this.readUInt16(),
            name: this.readUTF16String(),
            uuid: this.readUUID(),
            memoryList: null,
            hasAlphaChannel: true
        };
        console.log(item.name);
        this.tempLast.patternItem = item;
        if (item.colorMode === "INDEXED") {
            item.table = this.readColorTable();
            item.hasAlphaChannel = false;
        }
        item.memoryList = this.decodeVMA();
        return item;
    };
    PatParser.prototype.decodeVMA = function () {
        var vma = {
            version: this.readUInt32(),
            top: null,
            left: null,
            bottom: null,
            right: null,
            numberOfChannels: null,
            channels: []
        };
        this.tempLast.vma = vma;
        var _currentOffset = this.ofs;
        var _segmentLength = this.readUInt32();
        var end = _segmentLength + _currentOffset;
        this.tempLast.vmaSegmentEnd = end;
        vma.top = this.readUInt32();
        vma.left = this.readUInt32();
        vma.bottom = this.readUInt32();
        vma.right = this.readUInt32();
        vma.numberOfChannels = this.numberOfChannels(this.tempLast.patternItem.colorMode);
        for (var i = 0; i < vma.numberOfChannels; i++) {
            var channel = this.decodeChannel();
            if (channel === null || channel === void 0 ? void 0 : channel.exists) {
                vma.channels.push(channel);
            }
            else {
                vma.numberOfChannels -= 1;
                this.tempLast.patternItem.hasAlphaChannel = false;
            }
        }
        this.ofs = end + DWORD; // ?
        return vma;
    };
    PatParser.prototype.decodeChannel = function () {
        var channel = {
            exists: null,
            bottom: null,
            compressionMode: null,
            left: null,
            pixelDepth: null,
            rawData: null,
            right: null,
            top: null
        };
        this.tempLast.channel = channel;
        var sub = this.buf.subarray(this.ofs, this.tempLast.vmaSegmentEnd - DWORD);
        var start = sub.indexOf(new Uint8Array([0, 0, 0, 1]));
        if (start === -1) {
            channel.exists = false;
            return channel;
        }
        this.ofs += start;
        channel.exists = this.readUInt32() !== 0;
        if (!channel.exists) {
            return channel;
        }
        var segmentLength = this.readUInt32(); // ?
        if (segmentLength === 0) {
            return channel;
        }
        channel.pixelDepth = this.readUInt32(); // ?
        channel.top = this.readUInt32();
        channel.left = this.readUInt32();
        channel.bottom = this.readUInt32();
        channel.right = this.readUInt32();
        this.ofs += WORD; // pixel depth. Already defined above so we skip it.
        channel.compressionMode = this.readCompressionMode(); // ?
        channel.rawData = this.readRawData(segmentLength, channel.compressionMode);
        return channel;
    };
    PatParser.prototype.numberOfChannels = function (mode) {
        this.ofs += DWORD;
        switch (mode) {
            case "CMYK": return (4 + 1);
            case "LAB":
            case "RGB": return (3 + 1);
            case "GRAYSCALE": return (1 + 1);
            case "INDEXED": return 1;
        }
    };
    /**
     * For indexed color mode only
     */
    PatParser.prototype.readColorTable = function () {
        var sub = this.buf.subarray(this.ofs, this.ofs + 256 * 3);
        this.ofs += 256 * 3;
        this.ofs += DWORD; //skip that weird thing. It could possibly be reference to the transparent color since table is only RGB
        return sub;
    };
    /**
     * Unique ID of pattern
     * Always 37 characters
     * No length.
     * 1 byte per character.
     */
    PatParser.prototype.readUUID = function () {
        var result = this.buf.toString("ascii", this.ofs, this.ofs + UUIDLength);
        this.ofs += UUIDLength;
        return result;
    };
    /**
     * It is a lie. 1 is not a ZIP as says documentation. It is packbits. Each line packed separately.
     * @param length
     * @param compressionMode
     */
    PatParser.prototype.readRawData = function (length, compressionMode) {
        // depth, top, left, bottom, right, depth2, compression
        var subtract = DWORD + DWORD * 4 + WORD + BYTE; //23 bytes
        var subBuf = this.buf.subarray(this.ofs, this.ofs + (length - subtract));
        this.ofs += (length - subtract);
        if (compressionMode === "PackBits") {
            var skip = this.tempLast.channel.bottom * 2;
            return this.decodePackBits(subBuf.subarray(skip, subBuf.length), this.tempLast.channel.right * this.tempLast.channel.bottom);
        }
        else if (compressionMode === "NONE") {
            return subBuf;
        }
    };
    PatParser.prototype.decodePackBits = function (sourceBuffer, len) {
        var targetBuffer = buffer_1.Buffer.alloc(len);
        for (var i = 0, w = 0, sourceLen = sourceBuffer.length; i < sourceLen;) {
            var byte = sourceBuffer.readInt8(i);
            // -128 -> skip
            if (byte === -128) {
                i++;
                continue;
            }
            else if (byte < 0) {
                // -1 to -127 -> one byte of data repeated (1 - byte) times
                var length_1 = 1 - byte;
                for (var j = 0; j < length_1; j++) {
                    targetBuffer[w] = sourceBuffer[i + 1];
                    w++;
                }
                i += 2;
            }
            else {
                // 0 to 127 -> (1 + byte) literal bytes
                var length_2 = 1 + byte;
                for (var j = 0; j < length_2; j++) {
                    targetBuffer[w] = sourceBuffer[i + 1 + j];
                    w++;
                }
                i += length_2 + 1;
            }
        }
        return targetBuffer;
    };
    PatParser.prototype.readColorMode = function () {
        var mode = this.readUInt32(); // ?
        if (mode !== 3 && mode !== 2 && mode !== 1) {
            console.error("Unsupported mode: " + mode);
        }
        switch (mode) {
            case 0: return "BITMAP";
            case 1: return "GRAYSCALE";
            case 2: return "INDEXED";
            case 3: return "RGB";
            case 4: return "CMYK";
            case 7: return "MULTICHANNEL";
            case 8: return "DUOTONE";
            case 9: return "LAB";
            default: throw console.error("Unrecognized color mode: " + mode);
        }
    };
    PatParser.prototype.readCompressionMode = function () {
        var mode = this.readByte(); //?
        switch (mode) {
            case 0: return "NONE";
            case 1: return "PackBits";
            default: throw new Error("Uknown compression method: " + mode);
        }
    };
    /**
     * 1 byte length
     */
    PatParser.prototype.readByte = function () {
        var value = this.buf.readInt8(this.ofs);
        this.ofs += BYTE;
        return value;
    };
    /**
     * 2 byte length
     */
    PatParser.prototype.readUInt16 = function () {
        var value = this.buf.readUInt16BE(this.ofs);
        this.ofs += WORD;
        return value;
    };
    /**
     * 4 byte length
     */
    PatParser.prototype.readUInt32 = function () {
        var value = this.buf.readUInt32BE(this.ofs);
        this.ofs += DWORD;
        return value;
    };
    /**
     * 4 byte - number of characters including zero termination
     * 2 - byte per character
     * 2 - byte zero termination character
     */
    PatParser.prototype.readUTF16String = function () {
        var length = (this.readUInt32() - 1) * 2;
        var result = this.buf.subarray(this.ofs, this.ofs + length).swap16().toString("utf16le");
        this.ofs += length + WORD;
        return result;
    };
    return PatParser;
}());
exports.PatParser = PatParser;
