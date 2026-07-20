; ===========================================================================
; ---------------------------------------------------------------------------
; Patter Load Cues - Sonic's Arm
; ---------------------------------------------------------------------------
; Guide as Documented by Hivebrain
;
;	Each load cue consists of ten bytes:
;
;		dc.w $QQQQ,$----,$RRR-,$DDDD,$EEEE
;
;	$QQQQ = Number of tiles to load from Rom
;	$RRR- = Location to start reading the tiles
; ---------------------------------------------------------------------------
; the rest were not mentioned on the guide, and I am asuming are:
; ---------------------------------------------------------------------------
;	$---- = Unknown
;	$DDDD = I think it's some sort of dumping location (to dump the art)
;	$EEEE = whether it's the last PLC section to use or not (00 Include next PLC section/FF End of PLC section)
; ---------------------------------------------------------------------------
; ===========================================================================
; ---------------------------------------------------------------------------
PLCSArm_Wait1:		dc.w $2000,$9703,$0000,$D6A0,$FFFF	; Waiting 1
PLCSArm_Wait2:		dc.w $2000,$9703,$0020,$D6A0,$FFFF	; Waiting 2
PLCSArm_Wait3:		dc.w $2000,$9703,$0040,$D6A0,$FFFF	; Waiting 3
; ---------------------------------------------------------------------------
; Walking (Angle: 000* 180* degrees)
PLCSArm_Walk5_000:	dc.w $6000,$9703,$0060,$D6A0,$FFFF	; Walk 5
PLCSArm_Walk6_000:	dc.w $6000,$9703,$00C0,$D6A0,$FFFF	; Walk 6
PLCSArm_Walk1_000:	dc.w $6000,$9703,$0120,$D6A0,$FFFF	; Walk 1 (Also Stand)
PLCSArm_Walk2_000:	dc.w $6000,$9703,$0180,$D6A0,$FFFF	; Walk 2
PLCSArm_Walk3_000:	dc.w $4000,$9703,$01E0,$D6A0,$FFFF	; Walk 3
PLCSArm_Walk4_000:	dc.w $6000,$9703,$0220,$D6A0,$FFFF	; Walk 4
; ---------------------------------------------------------------------------
; Walking (Angle: 045* 225* degrees)
PLCSArm_Walk5_045:	dc.w $6000,$9703,$0280,$D6A0,$FFFF	; Walk 5
PLCSArm_Walk6_045:	dc.w $6000,$9703,$02E0,$D6A0,$FFFF	; Walk 6
PLCSArm_Walk1_045:	dc.w $4000,$9703,$0340,$D6A0,$FFFF	; Walk 1
PLCSArm_Walk2_045:	dc.w $6000,$9703,$0380,$D6A0,$FFFF	; Walk 2
PLCSArm_Walk3_045:	dc.w $4000,$9703,$03E0,$D6A0,$FFFF	; Walk 3
PLCSArm_Walk4_045:	dc.w $4000,$9703,$0420,$D6A0,$FFFF	; Walk 4
; ---------------------------------------------------------------------------
; Walking (Angle: 090* 270* degrees)
PLCSArm_Walk5_090:	dc.w $6000,$9703,$0460,$D6A0,$FFFF	; Walk 5
PLCSArm_Walk6_090:	dc.w $6000,$9703,$04C0,$D6A0,$FFFF	; Walk 6
PLCSArm_Walk1_090:	dc.w $6000,$9703,$0520,$D6A0,$FFFF	; Walk 1
PLCSArm_Walk2_090:	dc.w $6000,$9703,$0580,$D6A0,$FFFF	; Walk 2
PLCSArm_Walk3_090:	dc.w $4000,$9703,$05E0,$D6A0,$FFFF	; Walk 3
PLCSArm_Walk4_090:	dc.w $6000,$9703,$0620,$D6A0,$FFFF	; Walk 4
; ---------------------------------------------------------------------------
; Walking (Angle: 135* 315* degrees)
PLCSArm_Walk5_135:	dc.w $6000,$9703,$0680,$D6A0,$FFFF	; Walk 5
PLCSArm_Walk6_135:	dc.w $6000,$9703,$06E0,$D6A0,$FFFF	; Walk 6
PLCSArm_Walk1_135:	dc.w $4000,$9703,$0740,$D6A0,$FFFF	; Walk 1
PLCSArm_Walk2_135:	dc.w $6000,$9703,$0780,$D6A0,$FFFF	; Walk 2
PLCSArm_Walk3_135:	dc.w $4000,$9703,$07E0,$D6A0,$FFFF	; Walk 3
PLCSArm_Walk4_135:	dc.w $4000,$9703,$0820,$D6A0,$FFFF	; Walk 4
; ---------------------------------------------------------------------------
PLCSArm_Run_000:	dc.w $6000,$9703,$0860,$D6A0,$FFFF	; Running 1-4 (Angle: 000* 180* degrees)
PLCSArm_Run_045:	dc.w $4000,$9703,$08C0,$D6A0,$FFFF	; Running 1-4 (Angle: 045* 225* degrees)
PLCSArm_Run_090:	dc.w $6000,$9703,$0900,$D6A0,$FFFF	; Running 1-4 (Angle: 090* 270* degrees)
PLCSArm_Run_135:	dc.w $4000,$9703,$0960,$D6A0,$FFFF	; Running 1-4 (Angle: 135* 315* degrees)
; ---------------------------------------------------------------------------
PLCSArm_Pul_Lft_000:	dc.w $3000,$9703,$09A0,$D6A0,$FFFF	; Walk Pull (Arm Left)
PLCSArm_Pul_LftDwn_020:	dc.w $6000,$9703,$09D0,$D6A0,$FFFF	; Walk Pull (Arm Left/Down 020*)
PLCSArm_Pul_LftDwn_045:	dc.w $6000,$9703,$0A30,$D6A0,$FFFF	; Walk Pull (Arm Left/Down 045*)
PLCSArm_Pul_LftDwn_060:	dc.w $6000,$9703,$0A90,$D6A0,$FFFF	; Walk Pull (Arm Left/Down 060*)
PLCSArm_Pul_Dwn_000:	dc.w $6000,$9703,$0AF0,$D6A0,$FFFF	; Walk Pull (Arm Down)
PLCSArm_Pul_DwnRht_020:	dc.w $6000,$9703,$0B50,$D6A0,$FFFF	; Walk Pull (Arm Down/Right 020*)
PLCSArm_Pul_DwnRht_045:	dc.w $7000,$9703,$0BB0,$D6A0,$FFFF	; Walk Pull (Arm Down/Right 045*)
PLCSArm_Pul_DwnRht_060:	dc.w $6000,$9703,$0C20,$D6A0,$FFFF	; Walk Pull (Arm Down/Right 060*)
PLCSArm_Pul_Rht_000:	dc.w $6000,$9703,$0C80,$D6A0,$FFFF	; Walk Pull (Arm Right)
PLCSArm_Pul_RhtUp_020:	dc.w $6000,$9703,$0CE0,$D6A0,$FFFF	; Walk Pull (Arm Right/Up 020*)
PLCSArm_Pul_RhtUp_045:	dc.w $5000,$9703,$0D40,$D6A0,$FFFF	; Walk Pull (Arm Right/Up 045*)
PLCSArm_Pul_RhtUp_060:	dc.w $6000,$9703,$0D90,$D6A0,$FFFF	; Walk Pull (Arm Right/Up 060*)
PLCSArm_Pul_Up_000:	dc.w $3000,$9703,$0DF0,$D6A0,$FFFF	; Walk Pull (Arm Up)
PLCSArm_Pul_UpDwn_020:	dc.w $6000,$9703,$0E20,$D6A0,$FFFF	; Walk Pull (Arm Up/Left 020*)
PLCSArm_Pul_UpDwn_045:	dc.w $5000,$9703,$0E80,$D6A0,$FFFF	; Walk Pull (Arm Up/Left 045*)
PLCSArm_Pul_UpDwn_060:	dc.w $6000,$9703,$0ED0,$D6A0,$FFFF	; Walk Pull (Arm Up/Left 060*)
; ---------------------------------------------------------------------------
plcSArm_Hold1_000:	dc.w $3000,$9703,$0F30,$D6A0,$FFFF	; Holding Tails 1 (000*) (Used on 000*)
plcSArm_Hold2_000:	dc.w $3000,$9703,$0F60,$D6A0,$FFFF	; Holding Tails 2 (000*) (Used on 045*)
plcSArm_Hold3_000:	dc.w $3000,$9703,$0F90,$D6A0,$FFFF	; Holding Tails 3 (000*) (Used on 090*)
plcSArm_Hold1_045:	dc.w $6000,$9703,$0FC0,$D6A0,$FFFF	; Holding Tails 1 (045*) (Used on 135*)
plcSArm_Hold2_045:	dc.w $4000,$9703,$1020,$D6A0,$FFFF	; Holding Tails 2 (045*) (Unused)
plcSArm_Hold3_045:	dc.w $4000,$9703,$1060,$D6A0,$FFFF	; Holding Tails 3 (045*) (Unused)
plcSArm_Hold1_090:	dc.w $3000,$9703,$10A0,$D6A0,$FFFF	; Holding Tails 1 (090*) (Unused)
plcSArm_Hold2_090:	dc.w $3000,$9703,$10D0,$D6A0,$FFFF	; Holding Tails 2 (090*) (Unused)
plcSArm_Hold3_090:	dc.w $3000,$9703,$1100,$D6A0,$FFFF	; Holding Tails 3 (090*) (Unused)
plcSArm_Hold1_135:	dc.w $6000,$9703,$1130,$D6A0,$FFFF	; Holding Tails 1 (135*) (Unused)
plcSArm_Hold2_135:	dc.w $4000,$9703,$1190,$D6A0,$FFFF	; Holding Tails 2 (135*) (Unused)
plcSArm_Hold3_135:	dc.w $4000,$9703,$11D0,$D6A0,$FFFF	; Holding Tails 3 (135*) (Unused)
; ---------------------------------------------------------------------------
; Unused
PLCSArm_Unused_00:	dc.w $6000,$9703,$1210,$D6A0,$FFFF	; Unused
PLCSArm_Unused_01:	dc.w $6000,$9703,$1270,$D6A0,$FFFF	; Unused
PLCSArm_Unused_02:	dc.w $4000,$9703,$12D0,$D6A0,$FFFF	; Unused
PLCSArm_Unused_03:	dc.w $6000,$9703,$1310,$D6A0,$FFFF	; Unused
PLCSArm_Unused_04:	dc.w $6000,$9703,$1370,$D6A0,$FFFF	; Unused
PLCSArm_Unused_05:	dc.w $6000,$9703,$13D0,$D6A0,$FFFF	; Unused
PLCSArm_Unused_06:	dc.w $6000,$9703,$1430,$D6A0,$FFFF	; Unused
PLCSArm_Unused_07:	dc.w $6000,$9703,$1490,$D6A0,$FFFF	; Unused
PLCSArm_Unused_08:	dc.w $6000,$9703,$14F0,$D6A0,$FFFF	; Unused
PLCSArm_Unused_09:	dc.w $6000,$9703,$1550,$D6A0,$FFFF	; Unused
PLCSArm_Unused_0A:	dc.w $6000,$9703,$15B0,$D6A0,$FFFF	; Unused
PLCSArm_Unused_0B:	dc.w $6000,$9703,$1610,$D6A0,$FFFF	; Unused
PLCSArm_Unused_0C:	dc.w $6000,$9703,$1670,$D6A0,$FFFF	; Unused
PLCSArm_Unused_0D:	dc.w $5000,$9703,$16D0,$D6A0,$FFFF	; Unused
PLCSArm_Unused_0E:	dc.w $6000,$9703,$1720,$D6A0,$FFFF	; Unused
PLCSArm_Unused_0F:	dc.w $6000,$9703,$1780,$D6A0,$FFFF	; Unused
PLCSArm_Unused_10:	dc.w $6000,$9703,$17E0,$D6A0,$FFFF	; Unused
PLCSArm_Unused_11:	dc.w $6000,$9703,$1840,$D6A0,$FFFF	; Unused
PLCSArm_Unused_12:	dc.w $6000,$9703,$18A0,$D6A0,$FFFF	; Unused
PLCSArm_Unused_13:	dc.w $6000,$9703,$1900,$D6A0,$FFFF	; Unused
PLCSArm_Unused_14:	dc.w $6000,$9703,$1960,$D6A0,$FFFF	; Unused
PLCSArm_Unused_15:	dc.w $6000,$9703,$19C0,$D6A0,$FFFF	; Unused
PLCSArm_Unused_16:	dc.w $6000,$9703,$1A20,$D6A0,$FFFF	; Unused
PLCSArm_Unused_17:	dc.w $4000,$9703,$1A80,$D6A0,$FFFF	; Unused
PLCSArm_Unused_18:	dc.w $6000,$9703,$1AC0,$D6A0,$FFFF	; Unused
PLCSArm_Unused_19:	dc.w $6000,$9703,$1B20,$D6A0,$FFFF	; Unused
PLCSArm_Unused_1A:	dc.w $1000,$9703,$1B80,$D6A0,$FFFF	; Unused
			even
; ---------------------------------------------------------------------------
; ===========================================================================