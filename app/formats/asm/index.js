import * as Comlink from 'comlink';

import asmsg from './messages/as.msg';
import ioerrsmsg from './messages/ioerrs.msg';
import cmdargmsg from './messages/cmdarg.msg';
import p2binmsg from './messages/p2bin.msg';

const messages = {
    asmsg,
    ioerrsmsg,
    cmdargmsg,
};

export async function assemble(
    code,
    { filename } = {
        filename: 'code.asm',
    },
) {
    console.time('assemble');

    const aslWorker = new Worker('bundles/asl-worker.js');
    const asl = Comlink.wrap(aslWorker);

    const pFile = await asl.assemble(prelude + code, { messages, filename });
    aslWorker.terminate();

    console.log(pFile);

    const p2binWorker = new Worker('bundles/p2bin-worker.js');
    const p2bin = Comlink.wrap(p2binWorker);
    const bin = await p2bin.binary(pFile, {
        messages: { p2binmsg },
    });
    p2binWorker.terminate();

    console.log(bin);

    console.timeEnd('assemble');

    return bin;
}

const prelude = `SonicMappingsVer := 2

; macro to declare a mappings table (taken from Sonic 2 Hg disassembly)
mappingsTable macro {INTLABEL}
__LABEL__ label *
.current_mappings_table := __LABEL__
    endm

; macro to declare an entry in a mappings table (taken from Sonic 2 Hg disassembly)
mappingsTableEntry macro ptr
	dc.ATTRIBUTE ptr-.current_mappings_table
    endm

spriteHeader macro {INTLABEL}
__LABEL__ label *
	if SonicMappingsVer=1
	dc.b ((__LABEL___End - __LABEL___Begin) / 5)
	elseif SonicMappingsVer=2
	dc.w ((__LABEL___End - __LABEL___Begin) / 8)
	else
	dc.w ((__LABEL___End - __LABEL___Begin) / 6)
	endif
__LABEL___Begin label *
    endm

spritePiece macro xpos,ypos,width,height,tile,xflip,yflip,pal,pri
	if SonicMappingsVer=1
	dc.b	ypos
	dc.b	(((width-1)&3)<<2)|((height-1)&3)
	dc.b	((pri&1)<<7)|((pal&3)<<5)|((yflip&1)<<4)|((xflip&1)<<3)|((tile&$700)>>8)
	dc.b	tile&$FF
	dc.b	xpos
	elseif SonicMappingsVer=2
	dc.w	((ypos&$FF)<<8)|(((width-1)&3)<<2)|((height-1)&3)
	dc.w	((pri&1)<<15)|((pal&3)<<13)|((yflip&1)<<12)|((xflip&1)<<11)|(tile&$7FF)
	dc.w	((pri&1)<<15)|((pal&3)<<13)|((yflip&1)<<12)|((xflip&1)<<11)|((tile>>1)&$7FF)
	dc.w	xpos
	else
	dc.w	((ypos&$FF)<<8)|(((width-1)&3)<<2)|((height-1)&3)
	dc.w	((pri&1)<<15)|((pal&3)<<13)|((yflip&1)<<12)|((xflip&1)<<11)|(tile&$7FF)
	dc.w	xpos
	endif
	endm

spritePiece2P macro xpos,ypos,width,height,tile,xflip,yflip,pal,pri,tile2,xflip2,yflip2,pal2,pri2
	if SonicMappingsVer=1
	dc.b	ypos
	dc.b	(((width-1)&3)<<2)|((height-1)&3)
	dc.b	((pri&1)<<7)|((pal&3)<<5)|((yflip&1)<<4)|((xflip&1)<<3)|((tile&$700)>>8)
	dc.b	tile&$FF
	dc.b	xpos
	elseif SonicMappingsVer=2
	dc.w	((ypos&$FF)<<8)|(((width-1)&3)<<2)|((height-1)&3)
	dc.w	((pri&1)<<15)|((pal&3)<<13)|((yflip&1)<<12)|((xflip&1)<<11)|(tile&$7FF)
	dc.w	((pri2&1)<<15)|((pal2&3)<<13)|((yflip2&1)<<12)|((xflip2&1)<<11)|(tile2&$7FF)
	dc.w	xpos
	else
	dc.w	((ypos&$FF)<<8)|(((width-1)&3)<<2)|((height-1)&3)
	dc.w	((pri&1)<<15)|((pal&3)<<13)|((yflip&1)<<12)|((xflip&1)<<11)|(tile&$7FF)
	dc.w	xpos
	endif
	endm

dplcHeader macro {INTLABEL}
__LABEL__ label *
	if SonicDplcVer=1
	dc.b ((__LABEL___End - __LABEL___Begin) / 2)
	elseif SonicDplcVer=3
	dc.w (((__LABEL___End - __LABEL___Begin) / 2)-1)
	else
	dc.w ((__LABEL___End - __LABEL___Begin) / 2)
	endif
__LABEL___Begin label *
    endm

dplcEntry macro tiles,offset
	if SonicDplcVer=3
	dc.w	((offset&$FFF)<<4)|((tiles-1)&$F)
	elseif SonicDplcVer=4
	dc.w	(((tiles-1)&$F)<<12)|((offset&$FFF)<<4)
	else
	dc.w	(((tiles-1)&$F)<<12)|(offset&$FFF)
	endif
	endm

even macro
    if (*)&1
paddingSoFar		set paddingSoFar+1
        dc.b 0 ;ds.b 1
    endif
    endm

    cpu	68000
    `;
