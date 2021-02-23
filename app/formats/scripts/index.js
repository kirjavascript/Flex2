export { scripts } from './file';
export { parseASM } from './parse-asm';
export { default as runScript } from './run-script';

    // TESTS!
    // parseASM is slow
    // add zero optimization

// remove @ deprecated
// optimizations(false);
// reverse endianness

// ASM parser: just read data, ignore everything else
// use arcsecond or remove it

// UI

// file menu
//      ability to specify offset, size & etc
//      allow editing filename
//      format:
//      add conf to project
// remove acdeditor
// purple warning: arbitrary code - warning before yes
// derive UI from script - make dplcs still optional

// other

// need an external scrtipts folder copied to the root on bundle
// example: HUD graphics

// formats to support

// kid chameleon
// crackers
// chaotix
// plane mappings / snap to
// s2 special stages
// github issues
// sonic3player - unsplit - copy the file and change the format

//unsigned int a = 0xABCDEF23;
// a = ((a&(0x0000FFFF)) << 16) | ((a&(0xFFFF0000)) >> 16);
// a = ((a&(0x00FF00FF)) << 8) | ((a&(0xFF00FF00)) >>8);
// printf("%0x\n",a);
