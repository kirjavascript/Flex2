import * as Comlink from 'comlink';

// __flex2__done__

function init(code, { asmsg, ioerrsmsg, cmdargmsg }) {
    self.Module = {
        locateFile: url => `../wasm/${url}`,
        arguments: ['-q', '-xx', '-L', 'code.asm'],
        print: (text) => console.log('stdout: ' + text),
        printErr: (text) => console.error('stderr: ' + text),
        preInit: () => {
            FS.writeFile('as.msg', asmsg);
            FS.writeFile('cmdarg.msg', cmdargmsg);
            FS.writeFile('ioerrs.msg', ioerrsmsg);
            FS.writeFile('code.asm', prelude + code);
        },
    };
    importScripts('../wasm/asl.js');

    setTimeout(() => {

    console.log(self.Module.FS.readdir('/'));
    console.log(self.Module);
    }, 1000);
}

function build() {
}

Comlink.expose({
    init,
    build,
});

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

Map_hud_a:	mappingsTable
	mappingsTableEntry.w	Map_hud_a_0008
	mappingsTableEntry.w	Map_hud_a_005A
	mappingsTableEntry.w	Map_hud_a_00AC
	mappingsTableEntry.w	Map_hud_a_00FE

Map_hud_a_0008:	spriteHeader
	spritePiece	0, -$80, 4, 2, 0, 0, 0, 1, 0
	spritePiece	$20, -$80, 4, 2, $18, 0, 0, 1, 0
	spritePiece	$40, -$80, 4, 2, $20, 0, 0, 1, 0
	spritePiece	0, -$70, 4, 2, $10, 0, 0, 1, 0
	spritePiece	$28, -$70, 4, 2, $28, 0, 0, 1, 0
	spritePiece	0, -$60, 4, 2, 8, 0, 0, 1, 0
	spritePiece	$20, -$60, 1, 2, 0, 0, 0, 1, 0
	spritePiece	$30, -$60, 3, 2, $30, 0, 0, 1, 0
	spritePiece	0, $40, 2, 2, $10A, 0, 0, 0, 0
	spritePiece	$10, $40, 4, 2, $10E, 0, 0, 1, 0
Map_hud_a_0008_End

Map_hud_a_005A:	spriteHeader
	spritePiece	0, -$80, 4, 2, 0, 0, 0, 1, 0
	spritePiece	$20, -$80, 4, 2, $18, 0, 0, 1, 0
	spritePiece	$40, -$80, 4, 2, $20, 0, 0, 1, 0
	spritePiece	0, -$70, 4, 2, $10, 0, 0, 1, 0
	spritePiece	$28, -$70, 4, 2, $28, 0, 0, 1, 0
	spritePiece	0, -$60, 4, 2, 8, 0, 0, 0, 0
	spritePiece	$20, -$60, 1, 2, 0, 0, 0, 0, 0
	spritePiece	$30, -$60, 3, 2, $30, 0, 0, 1, 0
	spritePiece	0, $40, 2, 2, $10A, 0, 0, 0, 0
	spritePiece	$10, $40, 4, 2, $10E, 0, 0, 1, 0
Map_hud_a_005A_End

Map_hud_a_00AC:	spriteHeader
	spritePiece	0, -$80, 4, 2, 0, 0, 0, 1, 0
	spritePiece	$20, -$80, 4, 2, $18, 0, 0, 1, 0
	spritePiece	$40, -$80, 4, 2, $20, 0, 0, 1, 0
	spritePiece	0, -$70, 4, 2, $10, 0, 0, 0, 0
	spritePiece	$28, -$70, 4, 2, $28, 0, 0, 1, 0
	spritePiece	0, -$60, 4, 2, 8, 0, 0, 1, 0
	spritePiece	$20, -$60, 1, 2, 0, 0, 0, 1, 0
	spritePiece	$30, -$60, 3, 2, $30, 0, 0, 1, 0
	spritePiece	0, $40, 2, 2, $10A, 0, 0, 0, 0
	spritePiece	$10, $40, 4, 2, $10E, 0, 0, 1, 0
Map_hud_a_00AC_End

Map_hud_a_00FE:	spriteHeader
	spritePiece	0, -$80, 4, 2, 0, 0, 0, 1, 0
	spritePiece	$20, -$80, 4, 2, $18, 0, 0, 1, 0
	spritePiece	$40, -$80, 4, 2, $20, 0, 0, 1, 0
	spritePiece	0, -$70, 4, 2, $10, 0, 0, 0, 0
	spritePiece	$28, -$70, 4, 2, $28, 0, 0, 1, 0
	spritePiece	0, -$60, 4, 2, 8, 0, 0, 0, 0
	spritePiece	$20, -$60, 1, 2, 0, 0, 0, 0, 0
	spritePiece	$30, -$60, 3, 2, $30, 0, 0, 1, 0
	spritePiece	0, $40, 2, 2, $10A, 0, 0, 0, 0
	spritePiece	$10, $40, 4, 2, $10E, 0, 0, 1, 0
Map_hud_a_00FE_End

	even
    `;
