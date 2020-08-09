// arbitrary code warning

info();
offsetTable(dc.b);
mappingHeader(() => byte(Symbol('length')))
mapping((sprite, i) => [
    byte(sprite.top),
    nybble(0),
    bits(2, sprite.width - 1),
    bits(2, sprite.height - 1),
    bits(1, sprite.priority),
    bits(2, sprite.palette),
    bits(1, sprite.yflip),
    bits(1, sprite.xflip),
    bits(11, sprite.offset),
    word(sprite.left),
]);

// need an external scrtipts folder copied to the root on bundle
