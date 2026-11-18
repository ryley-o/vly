# Render the printable parts (needs OpenSCAD 2021.01 or newer) into build/*.stl and the preview pictures.
PARTS = front back door cartridge dpad button pill
all: $(PARTS:%=build/%.stl)
build/%.stl: vly1-handheld.scad
	@mkdir -p build
	openscad -o $@ -D 'part="$*"' vly1-handheld.scad
previews:
	xvfb-run -a openscad -o preview-front.png --imgsize=1200,800 --camera=60,-70,-230,0,0,10 --projection=p --colorscheme=Tomorrow -D 'part="assembly"' vly1-handheld.scad
	xvfb-run -a openscad -o preview-back-inside.png --imgsize=1200,800 --camera=40,-30,230,0,0,0 --projection=p --colorscheme=Tomorrow -D 'part="back"' vly1-handheld.scad
clean:
	rm -rf build
