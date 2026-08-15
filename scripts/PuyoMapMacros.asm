; mapping macros for Puyo Puyo / Dr. Robotnik's Mean Bean Machine
; pointer tables are absolute longs and pieces carry a sprite link byte

mappingsTable macro {INTLABEL}
__LABEL__ label *
.current_mappings_table := __LABEL__
    endm

mappingsTableEntry macro ptr
	dc.ATTRIBUTE ptr
    endm

spriteHeader macro {INTLABEL}
__LABEL__ label *
	dc.w ((__LABEL___End - __LABEL___Begin) / 8)
__LABEL___Begin label *
    endm

; declares a piece count that does not match the data that follows
spriteHeaderEnter macro count,{INTLABEL}
__LABEL__ label *
	dc.w count
__LABEL___Begin label *
    endm

spritePiece macro xpos,ypos,width,height,tile,xflip,yflip,pal,pri,lnk
	dc.w	ypos
	dc.b	(((width-1)&3)<<2)|((height-1)&3)
	dc.b	lnk
	dc.b	((pri&1)<<7)|((pal&3)<<5)|((yflip&1)<<4)|((xflip&1)<<3)|((tile&$700)>>8)
	dc.b	tile&$FF
	dc.w	xpos
	endm
