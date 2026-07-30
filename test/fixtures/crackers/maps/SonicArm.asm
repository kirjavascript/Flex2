; ===========================================================================
; ---------------------------------------------------------------------------
; Mappings - Sonic's Arm
; ---------------------------------------------------------------------------
; Guide as Documented by Hivebrain
;
;	Each mappings block consists of six bytes:
;
;		dc.w $SS,$YY,$TT,$TT,$XX,$ZZ
;
;	$SS   = Shape and size of sprite piece
;	$YY   = Y position of sprite piece
;	$TTTT = Tile to read in VRam
;	$XX   = X position of sprite piece
;	$ZZ   = whether it's the last map to use in the sprite or not (00 Include next map in sprite/FF End of sprite)
;
; ---------------------------------------------------------------------------
; ===========================================================================
; ---------------------------------------------------------------------------
MapSArm_Wait1:		dc.b $04,$00,$26,$B5,$08,$FF		; Waiting 1
MapSArm_Wait2:		dc.b $04,$00,$26,$B5,$00,$FF		; Waiting 2
MapSArm_Wait3:		dc.b $04,$00,$26,$B5,$00,$FF		; Waiting 3
; ---------------------------------------------------------------------------
; Walking (Angle: 000* 180* degrees)
MapSArm_Walk5_000:	dc.b $09,$00,$26,$B5,$00,$FF		; Walk 5
MapSArm_Walk6_000:	dc.b $09,$00,$26,$B5,$00,$FF		; Walk 6
MapSArm_Walk1_000:	dc.b $06,$01,$26,$B5,$00,$FF		; Walk 1 (Also Stand)
MapSArm_Walk2_000:	dc.b $09,$00,$26,$B5,$00,$FF		; Walk 2
MapSArm_Walk3_000:	dc.b $05,$00,$26,$B5,$00,$FF		; Walk 3
MapSArm_Walk4_000:	dc.b $09,$00,$26,$B5,$00,$FF		; Walk 4
; ---------------------------------------------------------------------------
; Walking (Angle: 045* 225* degrees)
MapSArm_Walk5_045:	dc.b $06,$00,$26,$B5,$00,$FF		; Walk 5
MapSArm_Walk6_045:	dc.b $09,$00,$26,$B5,$00,$FF		; Walk 6
MapSArm_Walk1_045:	dc.b $05,$00,$26,$B5,$00,$FF		; Walk 1
MapSArm_Walk2_045:	dc.b $06,$00,$26,$B5,$00,$FF		; Walk 2
MapSArm_Walk3_045:	dc.b $05,$05,$26,$B5,$00,$FF		; Walk 3
MapSArm_Walk4_045:	dc.b $05,$00,$26,$B5,$00,$FF		; Walk 4
; ---------------------------------------------------------------------------
; Walking (Angle: 090* 270* degrees)
MapSArm_Walk5_090:	dc.b $06,$00,$26,$B5,$00,$FF		; Walk 5
MapSArm_Walk6_090:	dc.b $06,$00,$26,$B5,$00,$FF		; Walk 6
MapSArm_Walk1_090:	dc.b $09,$00,$26,$B5,$00,$FF		; Walk 1
MapSArm_Walk2_090:	dc.b $06,$00,$26,$B5,$00,$FF		; Walk 2
MapSArm_Walk3_090:	dc.b $05,$00,$26,$B5,$00,$FF		; Walk 3
MapSArm_Walk4_090:	dc.b $06,$00,$26,$B5,$00,$FF		; Walk 4
; ---------------------------------------------------------------------------
; Walking (Angle: 135* 315* degrees)
MapSArm_Walk5_135:	dc.b $09,$00,$26,$B5,$00,$FF		; Walk 5
MapSArm_Walk6_135:	dc.b $06,$00,$26,$B5,$00,$FF		; Walk 6
MapSArm_Walk1_135:	dc.b $05,$00,$26,$B5,$00,$FF		; Walk 1
MapSArm_Walk2_135:	dc.b $09,$00,$26,$B5,$00,$FF		; Walk 2
MapSArm_Walk3_135:	dc.b $05,$00,$26,$B5,$05,$FF		; Walk 3
MapSArm_Walk4_135:	dc.b $05,$00,$26,$B5,$00,$FF		; Walk 4
; ---------------------------------------------------------------------------
MapSArm_Run_000:	dc.b $09,$00,$26,$B5,$00,$FF		; Running 1-4 (Angle: 000* 180* degrees)
MapSArm_Run_045:	dc.b $05,$00,$26,$B5,$00,$FF		; Running 1-4 (Angle: 045* 225* degrees)
MapSArm_Run_090:	dc.b $06,$00,$26,$B5,$00,$FF		; Running 1-4 (Angle: 090* 270* degrees)
MapSArm_Run_135:	dc.b $05,$00,$26,$B5,$00,$FF		; Running 1-4 (Angle: 135* 315* degrees)
; ---------------------------------------------------------------------------
MapSArm_Pul_Lft_000:	dc.b $08,$FB,$26,$B5,$E8,$FF		; Walk Pull (Arm Left)
MapSArm_Pul_LftDwn_020:	dc.b $09,$FE,$26,$B5,$EA,$FF		; Walk Pull (Arm Left/Down 020*)
MapSArm_Pul_LftDwn_045:	dc.b $09,$FE,$26,$B5,$EC,$FF		; Walk Pull (Arm Left/Down 045*)
MapSArm_Pul_LftDwn_060:	dc.b $06,$FE,$26,$B5,$F1,$FF		; Walk Pull (Arm Left/Down 060*)
MapSArm_Pul_Dwn_000:	dc.b $06,$FE,$26,$B5,$F9,$FF		; Walk Pull (Arm Down)
MapSArm_Pul_DwnRht_020:	dc.b $06,$FE,$26,$B5,$FD,$FF		; Walk Pull (Arm Down/Right 020*)
MapSArm_Pul_DwnRht_045:	dc.b $09,$02,$26,$B5,$FF,$00		; Walk Pull (Arm Down/Right 045*)
			dc.b $00,$FA,$26,$BB,$FD,$FF		; ''
MapSArm_Pul_DwnRht_060:	dc.b $09,$FE,$26,$B5,$FE,$FF		; Walk Pull (Arm Down/Right 060*)
MapSArm_Pul_Rht_000:	dc.b $05,$F7,$26,$B5,$08,$00		; Walk Pull (Arm Right)
			dc.b $04,$FD,$26,$B9,$F8,$FF		; ''
MapSArm_Pul_RhtUp_020:	dc.b $09,$F2,$26,$B5,$FE,$FF		; Walk Pull (Arm Right/Up 020*)
MapSArm_Pul_RhtUp_045:	dc.b $05,$ED,$26,$B5,$01,$00		; Walk Pull (Arm Right/Up 045*)
			dc.b $00,$FD,$26,$B9,$FE,$FF		; ''
MapSArm_Pul_RhtUp_060:	dc.b $06,$EB,$26,$B5,$FD,$FF		; Walk Pull (Arm Right/Up 060*)
MapSArm_Pul_Up_000:	dc.b $02,$E9,$26,$B5,$F8,$FF		; Walk Pull (Arm Up)
MapSArm_Pul_UpDwn_020:	dc.b $06,$EC,$26,$B5,$F1,$FF		; Walk Pull (Arm Up/Left 020*)
MapSArm_Pul_UpDwn_045:	dc.b $05,$ED,$26,$B5,$EB,$00		; Walk Pull (Arm Up/Left 045*)
			dc.b $00,$FD,$26,$B9,$F8,$FF		; ''
MapSArm_Pul_UpDwn_060:	dc.b $09,$F6,$26,$B5,$E9,$FF		; Walk Pull (Arm Up/Left 060*)
; ---------------------------------------------------------------------------
MapSArm_Hold1_000:	dc.b $08,$06,$26,$B5,$00,$FF		; Holding Tails 1 (000*) (Used on 000*)
MapSArm_Hold2_000:	dc.b $08,$08,$26,$B5,$00,$FF		; Holding Tails 2 (000*) (Used on 045*)
MapSArm_Hold3_000:	dc.b $08,$09,$26,$B5,$01,$FF		; Holding Tails 3 (000*) (Used on 090*)
MapSArm_Hold1_045:	dc.b $06,$00,$26,$B5,$00,$FF		; Holding Tails 1 (045*) (Used on 135*)
MapSArm_Hold2_045:	dc.b $05,$08,$26,$B5,$00,$FF		; Holding Tails 2 (045*) (Unused)
MapSArm_Hold3_045:	dc.b $05,$08,$26,$B5,$01,$FF		; Holding Tails 3 (045*) (Unused)
MapSArm_Hold1_090:	dc.b $02,$03,$26,$B5,$06,$FF		; Holding Tails 1 (090*) (Unused)
MapSArm_Hold2_090:	dc.b $02,$03,$26,$B5,$08,$FF		; Holding Tails 2 (090*) (Unused)
MapSArm_Hold3_090:	dc.b $02,$02,$26,$B5,$0A,$FF		; Holding Tails 3 (090*) (Unused)
MapSArm_Hold1_135:	dc.b $09,$09,$26,$B5,$07,$FF		; Holding Tails 1 (135*) (Unused)
MapSArm_Hold2_135:	dc.b $05,$08,$26,$B5,$08,$FF		; Holding Tails 2 (135*) (Unused)
MapSArm_Hold3_135:	dc.b $05,$07,$26,$B5,$09,$FF		; Holding Tails 3 (135*) (Unused)
; ---------------------------------------------------------------------------
; Unused
MapSArm_Unused_00:	dc.b $06,$18,$26,$B5,$06,$FF		; Unused
MapSArm_Unused_01:	dc.b $09,$0A,$26,$B5,$0B,$FF		; Unused
MapSArm_Unused_02:	dc.b $05,$0D,$26,$B5,$0A,$FF		; Unused
MapSArm_Unused_03:	dc.b $06,$11,$26,$B5,$00,$FF		; Unused
MapSArm_Unused_04:	dc.b $06,$1C,$26,$B5,$0B,$FF		; Unused
MapSArm_Unused_05:	dc.b $09,$15,$26,$B5,$15,$FF		; Unused
MapSArm_Unused_06:	dc.b $06,$0A,$26,$B5,$14,$FF		; Unused
MapSArm_Unused_07:	dc.b $06,$05,$26,$B5,$0D,$FF		; Unused
MapSArm_Unused_08:	dc.b $09,$0F,$26,$B5,$03,$FF		; Unused
MapSArm_Unused_09:	dc.b $06,$1C,$26,$B5,$05,$FF		; Unused
MapSArm_Unused_0A:	dc.b $09,$08,$26,$B5,$18,$FF		; Unused
MapSArm_Unused_0B:	dc.b $09,$13,$26,$B5,$16,$FF		; Unused
MapSArm_Unused_0C:	dc.b $06,$13,$26,$B5,$13,$FF		; Unused
MapSArm_Unused_0D:	dc.b $05,$05,$26,$B5,$04,$00		; Unused
			dc.b $00,$15,$26,$B9,$12,$FF		; ''
MapSArm_Unused_0E:	dc.b $09,$0E,$26,$B5,$04,$FF		; Unused
MapSArm_Unused_0F:	dc.b $09,$15,$26,$B5,$04,$FF		; Unused
MapSArm_Unused_10:	dc.b $06,$09,$26,$B5,$1E,$FF		; Unused
MapSArm_Unused_11:	dc.b $06,$12,$26,$B5,$0F,$FF		; Unused
MapSArm_Unused_12:	dc.b $06,$12,$26,$B5,$12,$FF		; Unused
MapSArm_Unused_13:	dc.b $09,$15,$26,$B5,$0E,$FF		; Unused
MapSArm_Unused_14:	dc.b $09,$12,$26,$B5,$04,$FF		; Unused
MapSArm_Unused_15:	dc.b $09,$0A,$26,$B5,$18,$FF		; Unused
MapSArm_Unused_16:	dc.b $09,$0E,$26,$B5,$15,$FF		; Unused
MapSArm_Unused_17:	dc.b $05,$11,$26,$B5,$03,$FF		; Unused
MapSArm_Unused_18:	dc.b $09,$12,$26,$B5,$13,$FF		; Unused
MapSArm_Unused_19:	dc.b $05,$0C,$26,$B5,$0D,$00		; Unused
			dc.b $04,$1C,$26,$B9,$0B,$FF		; ''
MapSArm_Unused_1A:	dc.b $00,$00,$26,$B5,$00,$FF		; Unused
			even
; ---------------------------------------------------------------------------
; ===========================================================================