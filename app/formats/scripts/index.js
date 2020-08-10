// padding / fill
// optimizations(false);
// loadASM();

// ASM & BIN read / write

// purple warning: arbitrary code - warning before yes
// derive UI from script - make dplcs still optional
// assert everything on sprite is correcr
// can read offset table
// need an external scrtipts folder copied to the root on bundle
// new Function('Flex2', script)({ read, write });
// when write is a value of bigger than max safe int
//
// read a byte at a time always
//
// cystom screen
//
// ; sonic 1 mapping
// (offset-table dc.b)
// (mapping TTTTTTTT 0000  WW HH P CC Y X AAAAAAAAAAA LLLLLLLL)

// ; sonic 2 mapping

// ; sonic 1 dplc
// (offset-table db.b)
// (dplc-header LLLL)
// (dplc NNNN AAAA AAAA AAAA)

// ; sonic 2/3&k dplc
// (offset-table dc.w)
// (dplc-header LLLLLLLL)
// (dplc NNNN AAAA AAAA AAAA)

// ; sonic 2/3&k non-player dplc
// (offset-table dc.w)
// (dplc-header (sub #1 LLLL))
// (dplc AAAA AAAA AAAA NNNN)
//
// TODO
// kid chameleon
// crackers
// chaotix
// github issues
//
// example: HUD graphics
// s2 special stages
