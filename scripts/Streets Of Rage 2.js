// Flex 2 Mapping Definition - Streets Of Rage

const {
    mappings,
    dplcs,
    offsetTable,
    write,
    read,
    dc,
    nybble,
    endFrame,
    skipFrame,
    signed,
} = Flex2;

// 0

// 				dc.b     0   = X position when facing right
// 				dc.b     $E8 = X position when facing left
// 				dc.b     $A8 = Y position
// 				dc.b     $B  = Tile Map Size eg 8x8,8x16 etc
// 				dc.b     0   = VRAM position
// 				dc.b     0	 = VRAM position
// mappingConfig(<>
//     <Select
//         options

//     />
// </>);

// sprites([
//     [({ sprite }) =>

//         [sprite, sprite]
//     ],
// ]);

mappings([
    [
        () => {
            const quantity = read(dc.w);
            read(dc.w);
            read(dc.w);
            return quantity > 0 && (({ mapping }, i) => {
                read(dc.b);
                mapping.left = read(dc.b, signed);
                mapping.top = read(dc.b, signed);
                read(nybble);
                mapping.width = read(2) + 1;
                mapping.height = read(2) + 1
                mapping.art = read(dc.w);
                mapping.priority = false;
                mapping.vflip = false;
                mapping.hflip = false;
                mapping.palette = 0;
                if (i === quantity) return endFrame;
            });
        },
        ({ sprite }) => {
            // write(dc.b, sprite.length);
            return ({ mapping }) => {
                // write(dc.b, mapping.top);
                // write(nybble, 0);
                // write(2, mapping.width - 1);
                // write(2, mapping.height - 1);
                // write(1, mapping.priority);
                // write(2, mapping.palette);
                // write(1, mapping.vflip);
                // write(1, mapping.hflip);
                // write(11, mapping.art);
                // write(dc.b, mapping.left);
            };
        },
    ],
]);

// dplcs([
//     offsetTable(dc.w),
//     [
//         () => {
//             const quantity = read(dc.b);
//             return quantity > 0 && (({ mapping }, frameIndex) => {
//                 mapping.size = read(nybble) + 1;
//                 mapping.art = read(nybble * 3);
//                 if (frameIndex === quantity - 1) return endFrame;
//             });
//         },
//         ({ sprite }) => {
//             write(dc.b, sprite.length);
//             return ({ mapping }) => {
//                 write(nybble, mapping.size - 1);
//                 write(nybble * 3, mapping.art);
//             };
//         },
//     ],
// ]);
