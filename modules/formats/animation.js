import chunk from 'lodash/chunk';

const sizeLookup = {
    'b': 1,
    'w': 2,
    'l': 4,
};

export function asmToAnim(buffer) {

    const asm = buffer.toString()
	.replace(/\$|even|(;(.*?)$)/gm, '') // remove comments / even / $ (assume no decimal)
	.replace(/(^\s*$)/gm, '') // remove empty lines
	.split('\n');

    const prefix = asm[0].split('AniData')[0];
    let obj = [];
    let rawData = asm.filter((line) => line.indexOf('dc.b') != -1);

    // Merge lines that belong to same animation together
    let rawData2 = [];
    let tmpstr = '';
    for(let i = 0; i < rawData.length; i++){
        if(rawData[i].indexOf(':') != -1 && tmpstr != ''){
            rawData2.push(tmpstr);
            tmpstr = rawData[i];
        } else if (tmpstr == '') {
            tmpstr = rawData[i];
        } else {
            tmpstr += ',' + rawData[i].split('dc.b')[1];
        }
    }
    rawData2.push(tmpstr);

    // Convert to animation object
    for(let i = 0; i < rawData2.length; i++){
        let rawFrames = rawData2[i].split('dc.b')[1].split(',').map((x) => parseInt('0x' + x.replace(/ /g,'')));
        let rawLoopData = rawFrames.slice(1).slice(rawFrames.findIndex((x) => x >= 0xF9) - 1);
        let loopMode = '';
        let loopLen = 0; // For 0xFE
        let gotoAnim = 0; // For 0xFD
	
        switch(rawLoopData[0]){
        default:
        case 0xFF:
            loopMode = 'Loop All';
            break;
        case 0xFE:
            loopMode = 'Loop X Frames';
            loopLen = rawLoopData[1];
            break;
        case 0xFD:
            loopMode = 'Goto Animation X';
            gotoAnim = rawLoopData[1];
            break;
        case 0xFC:
            loopMode = 'Increment Primary Routine';
            break;
        case 0xFB:
            loopMode = 'Reset Secondary Routine';
            break;
        case 0xFA:
            loopMode = 'Increment Secondary Routine';
            break;
        case 0xF9:
            loopMode = 'Increment Status Byte 2A';
            break;
        }
	
        obj.push({
            'name': rawData2[i].split('_')[1].split(':')[0],
            'frames': rawFrames.slice(1, rawFrames.slice(1).findIndex((x) => x >= 0xF9)+1),
            'loopMode': loopMode,
            'speed': rawFrames[0],
            'loopLen': loopLen,
            'gotoAnim': gotoAnim
        });
    }

    return {obj: obj, prefix: prefix};
}

export function animToAsm(obj, prefix) {
    let buffer = '';

    // Write pointer table
    buffer += prefix + 'AniData:\toffsetTable\r\n';
    for (let x of obj) {
        buffer += prefix + 'Ani_' + x.name + '_ptr:\toffsetTableEntry.w ' + prefix + 'Ani_' + x.name + '\r\n';
    }

    // Write data
    for (let x of obj) {
        buffer += prefix + 'Ani_' + x.name + ':\tdc.b ';
        // Speed
        buffer += '$' + x.speed.toString(16).toUpperCase();
        // Frames
        for (let i = 0; i < x.frames.length; i++) {
            if(i%8 != 7){
                buffer += ',$' + x.frames[i].toString(16).toUpperCase();
            } else {
                buffer += '\r\n\t\tdc.b $' + x.frames[i].toString(16).toUpperCase();
            }
        }
        // Loop mode
        switch(x.loopMode){
        case 'Loop All':
            buffer += ',$FF\r\n';
            break;
        case 'Loop X Frames':
            buffer += ',$FE,$' + x.loopLen.toString(16).toUpperCase() + '\r\n';
            break;
        case 'Goto Animation X':
            buffer += ',$FD,$' + x.gotoAnim.toString(16).toUpperCase() + '\r\n';
            break;
        case 'Increment Primary Routine':
            buffer += ',$FC\r\n';
            break;
        case 'Reset Secondary Routine':
            buffer += ',$FB\r\n';
            break;
        case 'Increment Secondary Routine':
            buffer += ',$FA\r\n';
            break;
        case 'Increment Status Byte 2A':
            buffer += ',$F9\r\n';
            break;
        }
        buffer += '\trev02even\r\n';
    }

    return buffer;
}