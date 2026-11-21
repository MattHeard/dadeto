#!/usr/bin/env python3
"""Compile the authored upper-panel floor plan into bounded Minecraft placements."""
import hashlib
import html
import json
from pathlib import Path
import sys

HERE = Path(__file__).resolve().parent
spec = json.loads((HERE / 'maps/nobles-house.json').read_text())
out = Path(sys.argv[1]) if len(sys.argv) > 1 else HERE / 'build'
out.mkdir(parents=True, exist_ok=True)
scale = spec['scale']
assert scale['feet_per_square'] == 5 and scale['blocks_per_square'] == 2
unit = scale['pixels_per_square'] / scale['blocks_per_square']
origin_x, origin_z = scale['image_origin']
y = spec['floor_y']
x0, z0, x1, z1 = spec['bounds']
blocks = {}

def point(p):
    return round((p[0] - origin_x) / unit), round((p[1] - origin_z) / unit)

def put(x, h, z, material):
    assert x0 <= x <= x1 and z0 <= z <= z1 and y - 1 <= h <= y + 6, (x, h, z)
    blocks[(x, h, z)] = 'minecraft:' + material

def box(a, b, material, h=y):
    for x in range(min(a[0], b[0]), max(a[0], b[0]) + 1):
        for z in range(min(a[1], b[1]), max(a[1], b[1]) + 1):
            put(x, h, z, material)

def inside(x, z, polygon):
    yes = False
    for (ax, az), (bx, bz) in zip(polygon, polygon[1:] + polygon[:1]):
        if (az > z) != (bz > z) and x < (bx - ax) * (z - az) / (bz - az) + ax:
            yes = not yes
    return yes

def floor(polygon, material, alternate=None):
    for x in range(x0, x1 + 1):
        for z in range(z0, z1 + 1):
            if inside(x + .5, z + .5, polygon):
                put(x, y, z, alternate if alternate and (x + z) % 2 else material)

def line(a, b):
    distance = max(abs(b[0] - a[0]), abs(b[1] - a[1]))
    for i in range(distance + 1):
        t = i / max(distance, 1)
        yield round(a[0] + t * (b[0] - a[0])), round(a[1] + t * (b[1] - a[1]))

# Clear only the explicitly owned tabletop footprint; no survival-world edits.
for h in range(y - 1, y + 7):
    box((x0, z0), (x1, z1), 'air', h)
box((x0, z0), (x1, z1), 'polished_deepslate', y - 1)
for x in range(x0, x1 + 1):
    for z in range(z0, z1 + 1):
        put(x, y, z, 'cobblestone' if (x * 11 + z * 7) % 5 else 'mossy_cobblestone')
# West entrance terrace and northern small terrace.
floor([point(p) for p in [[200,830],[300,830],[300,710],[470,710],[470,1220],[200,1220]]], 'smooth_quartz')
box(point([1200,430]), point([1540,510]), 'smooth_quartz')
outline = [point(p) for p in spec['outline']]
floor(outline, 'smooth_sandstone')
for room in spec['rooms']:
    poly = room.get('polygon')
    if poly is None:
        a,b,c,d = room['rect']; poly = [[a,b],[c,b],[c,d],[a,d]]
    floor([point(p) for p in poly], room['floor'], room.get('checker'))
# Reference floorboards and optional two-block (5ft) grid are visible in foyers.
for a,b in zip(outline, outline[1:] + outline[:1]):
    for x,z in line(a,b):
        put(x,y+1,z,'stone_bricks')
        if (x + z) % 3 == 0:
            put(x,y+2,z,'stone_brick_slab[type=bottom]')
for wall in spec['walls']:
    pts=[point(p) for p in wall]
    for a,b in zip(pts,pts[1:]):
        for x,z in line(a,b): put(x,y+1,z,'dark_oak_planks')
for opening in spec['openings']:
    for x,z in line(point(opening[:2]), point(opening[2:])):
        for h in [y+1,y+2]: put(x,h,z,'air')
# Ascending ground-floor stair flight, without an upper floor or roof.
for i in range(10):
    for dx in range(3):
        put(17+dx,y+1+i//3,18-i,'oak_stairs[facing=north]')

for item in spec['furniture']:
    x,z=point(item['at']);kind=item['type'];h=y+1
    if kind=='rug':
        r=item['radius']
        for dx in range(-r,r+1):
            for dz in range(-r,r+1):
                if dx*dx+dz*dz <= r*r:put(x+dx,h,z+dz,'red_carpet')
    elif kind in ['table','desk']:
        w,d=item['size']
        box((x,z),(x+w-1,z+d-1),'dark_oak_slab[type=top]',h)
        for dx,dz in [(0,0),(w-1,0),(0,d-1),(w-1,d-1)]:put(x+dx,h,z+dz,'oak_planks')
        if kind=='desk':put(x+1,h+1,z,'white_carpet');put(x+w-2,h+1,z,'flower_pot')
        if item.get('plates'):
            for dx in [1,3,5]:
                for dz in [0,d-1]:put(x+dx,h+1,z+dz,'light_weighted_pressure_plate')
            put(x+3,h+1,z+1,'potted_red_tulip')
    elif kind=='chair':
        put(x,h,z,'crimson_stairs[facing='+item['facing']+']')
    elif kind in ['sofa','bench','shelf','counter']:
        length=item['length'];horizontal=item['axis']=='x'
        for i in range(length):
            a,b=x+(i if horizontal else 0),z+(0 if horizontal else i)
            mat={'sofa':'red_wool','bench':'spruce_stairs[facing=north]','shelf':'bookshelf','counter':'spruce_planks'}[kind]
            put(a,h,b,mat)
            if kind=='sofa':put(a,h+1,b,'red_carpet')
        if kind=='sofa':
            put(x,h+1,z,'red_wool');put(x+(length-1 if horizontal else 0),h+1,z+(0 if horizontal else length-1),'red_wool')
    elif kind=='piano':
        for dx in range(5):
            for dz in range(6):
                if dx+dz<8:put(x+dx,h,z+dz,'black_concrete')
        for dx in range(5):put(x+dx,h+1,z,'white_carpet' if dx%2==0 else 'black_carpet')
        put(x+2,h,z-2,'spruce_stairs[facing=south]')
    elif kind=='bed':
        put(x,h,z,'brown_bed[facing=north,part=head]')
        put(x,h,z+1,'brown_bed[facing=north,part=foot]')
    elif kind=='lamp':
        put(x,h,z,'oak_fence');put(x,h+1,z,'lantern')
    elif kind=='plant':put(x,h,z,'potted_fern')
    elif kind=='barrel':put(x,h,z,'barrel')
    elif kind=='workbench':put(x,h,z,'crafting_table');put(x+1,h,z,'cartography_table')
    elif kind=='furnace':put(x,h,z,'furnace[facing=west]');put(x,h,z+1,'smoker[facing=west]')
    elif kind=='sink':put(x,h,z,'water_cauldron[level=3]')
    else:raise ValueError(kind)

rows=['# '+spec['title'], '# 2x2 blocks = 5ft; all ground-floor rooms revealed']
rows += [f'{x}\t{h}\t{z}\t{state}' for (x,h,z),state in sorted(blocks.items(),key=lambda p:(p[0][1],p[0][0],p[0][2]))]
plan='\n'.join(rows)+'\n';(out/'house.tsv').write_text(plan)
# Separate walk-through south of the board. Preserve the original board byte-for-byte.
walk = {pos: material for pos, material in blocks.items() if material != 'minecraft:air'}
shell = set()
for a, b in zip(outline, outline[1:] + outline[:1]):
    for x, z in line(a, b):
        shell.add((x, z))
        for h in range(1, 5):
            walk[x, y+h, z] = 'minecraft:stone_bricks'
        if (x+z) % 5 in (0, 1):
            walk[x, y+2, z] = 'minecraft:glass'
            walk[x, y+3, z] = 'minecraft:glass'
for wall in spec['walls']:
    points = [point(p) for p in wall]
    for a, b in zip(points, points[1:]):
        for x, z in line(a, b):
            for h in range(1, 5):
                walk[x, y+h, z] = 'minecraft:dark_oak_planks'
for opening in spec['openings']:
    for x, z in line(point(opening[:2]), point(opening[2:])):
        for h in range(1, 4):
            walk.pop((x, y+h, z), None)
for x in range(x0, x1+1):
    for z in range(z0, z1+1):
        if (x,z) in shell or inside(x+.5,z+.5,outline):
            walk[x,y+5,z] = 'minecraft:dark_oak_planks'
            if (x+z) % 9 == 0 and (x,z) not in shell and (x,y+4,z) not in walk:
                walk[x,y+4,z] = 'minecraft:ochre_froglight'
for x in (-9,-8,-7):
    for z in range(-15,-4):
        walk[x,y,z] = 'minecraft:stone_bricks'
        if x != -8:
            walk[x,y+1,z] = 'minecraft:oak_fence'
# Add doorways where the low presentation walls were previously stepped over.
for x, z in ((21, 8), (22, 8), (22, 21), (23, 21)):
    for h in range(1, 4):
        walk.pop((x, y+h, z), None)

def walkable(x, z):
    feet = walk.get((x, y+1, z), "minecraft:air")
    return ((x, y, z) in walk and (x, y+2, z) not in walk
            and (feet == "minecraft:air" or feet.endswith("_carpet")))

reachable = {(-8, 23)}
pending = list(reachable)
while pending:
    x, z = pending.pop()
    for neighbor in ((x+1,z), (x-1,z), (x,z+1), (x,z-1)):
        if neighbor not in reachable and walkable(*neighbor):
            reachable.add(neighbor)
            pending.append(neighbor)
for room in spec['rooms']:
    x, z = point(room['label'])
    assert any(abs(a-x)+abs(b-z) <= 2 for a,b in reachable), room['name']
legacy = walk.copy()
upper = y + 5
footprint = {(x,z) for x in range(x0,x1+1) for z in range(z0,z1+1)
             if (x,z) in shell or inside(x+.5,z+.5,outline)}
for x,z in footprint:
    walk[x,upper,z] = 'minecraft:dark_oak_planks' if (x,z) in shell else 'minecraft:spruce_planks'
    walk[x,upper+5,z] = 'minecraft:dark_oak_planks'
    if (x,z) in shell:
        for h in range(1,5):
            walk[x,upper+h,z] = ('minecraft:glass' if h in (2,3) and (x+z)%5 < 2
                                  else 'minecraft:stone_bricks')
    elif (x+z)%11 == 0:
        walk[x,upper+4,z] = 'minecraft:ochre_froglight'

# Room partitions follow the main bands in the upper reference diagram.
for a,b,doors in (
    ((12,5),(12,20),{(12,17),(12,18)}),
    ((29,7),(29,20),{(29,17),(29,18)}),
    ((30,20),(46,20),{(35,20),(36,20)}),
    ((3,27),(12,27),{(10,27),(11,27)}),
    ((13,27),(13,46),{(13,33),(13,34)}),
    ((13,37),(35,37),{(17,37),(18,37),(26,37),(27,37)}),
    ((19,37),(19,45),{(19,39),(19,40)}),
    ((35,29),(35,44),{(35,34),(35,35)}),
    ((35,29),(49,29),{(40,29),(41,29)}),
):
    for x,z in line(a,b):
        if (x,z) in footprint and (x,z) not in shell:
            for h in range(1,5):
                if (x,z) not in doors or h > 3:
                    walk[x,upper+h,z] = 'minecraft:dark_oak_planks'

def furnish(x,z,material,h=1):
    assert (x,z) in footprint and (x,z) not in shell
    assert (x,upper+h,z) not in walk
    walk[x,upper+h,z] = 'minecraft:' + material

for x,z in ((6,9),(6,15),(37,9),(29,44),(43,39)):
    furnish(x,z,'red_bed[facing=north,part=head]')
    furnish(x,z+1,'red_bed[facing=north,part=foot]')
for x,z in ((8,12),(39,11),(42,23),(7,34),(28,40),(44,35)):
    furnish(x,z,'dark_oak_planks')
    furnish(x,z,'flower_pot',2)
for x in range(15,18):
    for z in range(40,43):
        furnish(x,z,'water_cauldron[level=3]' if (x,z)==(16,41) else 'quartz_block')
for x,z in ((9,13),(38,14),(40,24),(8,37),(27,43),(42,37)):
    furnish(x,z,'red_carpet')

# Replace the display stair with five contiguous three-wide, full-rise treads.
# North-facing stairs rise toward the landing at z=13. Clear the old steps and headroom.
for x in range(17,20):
    for z in range(9,19):
        for h in range(1,5):
            if 'oak_stairs' in walk.get((x,y+h,z),''):
                walk.pop((x,y+h,z))
    for index,z in enumerate(range(18,13,-1),1):
        stair_y = y+index
        for h in range(stair_y+1,stair_y+3):
            walk.pop((x,h,z),None)
        walk[x,stair_y,z] = 'minecraft:oak_stairs[facing=north]'
    assert walk[x,upper,13] == 'minecraft:spruce_planks'
    assert all((x,upper+h,13) not in walk for h in (1,2))
assert any((x,19) in reachable for x in range(17,20)), "Stair base must connect to entrance"
for z in range(15,19):
    for x in (16,20):
        if (x,upper,z) in walk and (x,upper+1,z) not in walk:
            walk[x,upper+1,z] = 'minecraft:oak_fence'
for x in range(17,20):
    if (x,upper+1,19) not in walk:
        walk[x,upper+1,19] = 'minecraft:oak_fence'

def upper_open(x,z):
    below = walk.get((x,upper,z),'')
    feet = walk.get((x,upper+1,z),'')
    return below == 'minecraft:spruce_planks' and (not feet or feet.endswith('_carpet')) and (x,upper+2,z) not in walk

upstairs = {(18,13)}
pending = list(upstairs)
while pending:
    x,z = pending.pop()
    for neighbor in ((x+1,z),(x-1,z),(x,z+1),(x,z-1)):
        if neighbor not in upstairs and upper_open(*neighbor):
            upstairs.add(neighbor)
            pending.append(neighbor)
for room in ((8,13),(38,14),(40,24),(8,37),(17,42),(27,43),(42,37)):
    assert any(abs(a-room[0])+abs(b-room[1]) <= 2 for a,b in upstairs), room

for position in legacy.keys() - walk.keys():
    walk[position] = 'minecraft:air'
(out/'walkthrough-v1.tsv').write_text(''.join(
    f'{x}\t{h}\t{z+72}\t{material}\n' for (x,h,z),material in sorted(legacy.items())
    if walk.get((x,h,z)) != material))
# Manor exterior. Keep the entire v2 interior and its traversal surfaces intact.
v2 = walk.copy()
edge_neighbors = ((1,0),(-1,0),(0,1),(0,-1))
for x,z in sorted(shell):
    for h in range(y+1,upper+5):
        position = (x,h,z)
        material = walk.get(position)
        if material == 'minecraft:stone_bricks':
            if h > upper and x % 5 == 0 and z % 5 == 0:
                walk[position] = 'minecraft:stripped_dark_oak_log[axis=y]'
            elif h == upper+4 and (x+z)%4 == 0:
                walk[position] = 'minecraft:spruce_planks'
            elif (x*13+z*7+h*3)%11 < 2:
                walk[position] = 'minecraft:cracked_stone_bricks'
            elif (x*7+z*13+h)%11 == 0:
                walk[position] = 'minecraft:andesite'
        if material == 'minecraft:glass' and h in (y+2,upper+2):
            for dx,dz in edge_neighbors:
                outside = (x+dx,z+dz)
                if outside not in footprint:
                    walk.setdefault((outside[0],h-1,outside[1]), 'minecraft:spruce_slab[type=top]')
    for dx,dz in edge_neighbors:
        outside = (x+dx,z+dz)
        if outside not in footprint:
            walk.setdefault((outside[0],upper,outside[1]), 'minecraft:spruce_slab[type=top]')

# Hip the slate roof inward from the irregular perimeter and add one-block eaves.
roof = footprint | {(x+dx,z+dz) for x,z in footprint for dx,dz in edge_neighbors}
remaining = roof.copy()
ceiling = upper+5
for rise in range(11):
    inner = {p for p in remaining if all((p[0]+dx,p[1]+dz) in remaining for dx,dz in edge_neighbors)}
    band = remaining-inner if rise < 10 else remaining
    for x,z in sorted(band):
        roof_y = ceiling+rise+1
        walk[x,roof_y,z] = ('minecraft:polished_deepslate' if rise == 0
                            else 'minecraft:deepslate_tiles')
        if rise == 0:
            walk.setdefault((x,ceiling,z), 'minecraft:dark_oak_slab[type=top]')
    remaining = inner
    if not remaining:
        break

# Masonry chimney stacks with projecting caps bring vertical accents to the roof.
for x,z in ((11,12),(40,33)):
    for a in (x,x+1):
        for b in (z,z+1):
            for h in range(ceiling+1,ceiling+13):
                walk[a,h,b] = 'minecraft:bricks'
            walk[a,ceiling+13,b] = 'minecraft:brick_slab[type=top]'

for position in walk.keys() | v2.keys():
    x,h,z = position
    changed = walk.get(position) != v2.get(position)
    if changed and h <= ceiling:
        assert (x,z) not in footprint or ((x,z) in shell
                and v2[position] == 'minecraft:stone_bricks'), position
        assert h >= y+1 and (x,z) != (-8,23), position
(out/'walkthrough-v2.tsv').write_text(''.join(
    f'{x}\t{h}\t{z+72}\t{material}\n' for (x,h,z),material in sorted(v2.items())
    if walk.get((x,h,z)) != material))
# Refinish only existing surfaces. The rooms, furnishings and collision geometry
# keep their exact coordinates. Use the old states as guarded migration inputs.
v3 = walk.copy()
finishes = {
    'minecraft:smooth_sandstone': 'minecraft:polished_diorite',
    'minecraft:birch_planks': 'minecraft:spruce_planks',
    'minecraft:oak_planks': 'minecraft:dark_oak_planks',
    'minecraft:spruce_planks': 'minecraft:dark_oak_planks',
    'minecraft:polished_andesite': 'minecraft:polished_tuff',
    'minecraft:polished_diorite': 'minecraft:calcite',
    'minecraft:smooth_quartz': 'minecraft:polished_diorite',
}
for (x,h,z), material in v3.items():
    if (x,z) not in footprint or (x,z) in shell:
        continue
    if h in (y,upper) and material in finishes:
        # Retain a narrow border where a room meets another floor finish.
        border = any(v3.get((x+dx,h,z+dz)) != material for dx,dz in edge_neighbors)
        if border and material.endswith('_planks'):
            walk[x,h,z] = 'minecraft:stripped_spruce_wood'
        else:
            walk[x,h,z] = finishes[material]
    elif h in (y+2,y+3,upper+2,upper+3) and material == 'minecraft:dark_oak_planks':
        # Leave a dark timber dado and top band on existing partitions.
        walk[x,h,z] = 'minecraft:smooth_sandstone'
    elif h in (y+1,upper+1) and material == 'minecraft:red_carpet':
        walk[x,h,z] = 'minecraft:purple_carpet'
    elif h in (y+4,upper+4) and material == 'minecraft:ochre_froglight':
        walk[x,h,z] = 'minecraft:shroomlight'

changes = {(x,h,z): old for (x,h,z),old in v3.items() if walk[x,h,z] != old}
assert walk.keys() == v3.keys()
full_blocks = set(finishes) | set(finishes.values()) | {
    'minecraft:stripped_spruce_wood', 'minecraft:dark_oak_planks',
    'minecraft:ochre_froglight', 'minecraft:shroomlight',
}
for (x,h,z), old in changes.items():
    new = walk[x,h,z]
    assert (x,z) in footprint-shell and y <= h <= upper+4
    assert ((old in full_blocks and new in full_blocks)
            or (old == 'minecraft:red_carpet' and new == 'minecraft:purple_carpet'))
assert all(any(h == floor for _,h,_ in changes) for floor in (y,upper))
(out/'walkthrough-v3.tsv').write_text(''.join(
    f'{x}\t{h}\t{z+72}\t{old}\n' for (x,h,z),old in sorted(changes.items())))
walk_rows = [f'{x}\t{h}\t{z+72}\t{material}' for (x,h,z),material in sorted(walk.items())]
(out/'walkthrough.tsv').write_text('\n'.join(walk_rows)+'\n')
views=[]
for view in spec['views']:
    x,z=point(view['at']);views.append(f"{view['name']}\t{x+.5}\t{y+view['height']}\t{z+.5}")
(out/'views.tsv').write_text('\n'.join(views)+'\n')
summary={'id':spec['id'],'placements':len(blocks),'nonAir':sum(v!='minecraft:air' for v in blocks.values()),'scale':scale,'bounds':spec['bounds'],'planSha256':hashlib.sha256(plan.encode()).hexdigest(),'rooms':[r['name'] for r in spec['rooms']],'views':len(views)}
(out/'manifest.json').write_text(json.dumps(summary,indent=2)+'\n')
# Source-native layout preview; this is not a screenshot of the Minecraft client.
colors={'cobblestone':'#89918c','mossy_cobblestone':'#73816d','polished_deepslate':'#454b50','smooth_sandstone':'#d7c58a','birch_planks':'#d7b97c','spruce_planks':'#977147','dark_oak_planks':'#65492f','smooth_quartz':'#e9e6d7','polished_diorite':'#d1d2cb','polished_andesite':'#9b9c96','stone_bricks':'#727a7c','red_carpet':'#9d4148','red_wool':'#8d343e','black_concrete':'#20242b','white_carpet':'#eee8dd','brown_bed':'#a98466','bookshelf':'#514930','water_cauldron':'#6b9da0','lantern':'#eac772','barrel':'#a07a42'}
top={}
for (x,h,z),state in blocks.items():
    if state != 'minecraft:air' and ((x,z) not in top or h > top[(x,z)][0]):
        top[(x,z)] = (h,state)
svg=[f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1100 1040"><rect width="1100" height="1040" fill="#172329"/><text x="40" y="38" fill="#f1e8ce" font-size="23" font-family="sans-serif">Noble’s House · ground floor · 2 × 2 blocks / 5 ft</text>']
cell=14;ox=55;oz=70
for (x,z),(h,state) in top.items():
    key=state.removeprefix('minecraft:').split('[')[0];c=colors.get(key,'#b38b52')
    svg.append(f'<rect x="{ox+(x-x0)*cell}" y="{oz+(z-z0)*cell}" width="{cell}" height="{cell}" fill="{c}" stroke="#182021" stroke-opacity=".16"/>')
for x in range(x0,x1+1,2):svg.append(f'<path d="M {ox+(x-x0)*cell} {oz} v {(z1-z0+1)*cell}" stroke="#fff" opacity=".1"/>')
for z in range(z0,z1+1,2):svg.append(f'<path d="M {ox} {oz+(z-z0)*cell} h {(x1-x0+1)*cell}" stroke="#fff" opacity=".1"/>')
for room in spec['rooms']:
    x,z=point(room['label']);svg.append(f'<text x="{ox+(x-x0)*cell}" y="{oz+(z-z0)*cell}" text-anchor="middle" fill="white" stroke="#162124" stroke-width="3" paint-order="stroke" font-family="sans-serif" font-size="13">{html.escape(room["name"])}</text>')
svg+=['<text x="40" y="990" fill="#d8d7c9" font-family="sans-serif" font-size="15">Authored block-layout preview · roofless, all rooms revealed · reference: MikWewa / supplied by user</text></svg>']
(out/'preview.svg').write_text(''.join(svg))
print(json.dumps(summary,indent=2))
