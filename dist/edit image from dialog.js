/**
🖌
@file edit image from dialog
@summary edit sprites, items, and tiles from dialog
@license MIT
@version 1.0.0
@author Sean S. LeBlanc

@description
You can use this to edit the image data of sprites (including the player avatar), items, and tiles through dialog.
Image data can be replaced with data from another image, and the palette index can be set.

(image "map, target, source")
Parameters:
  map:    Type of image (SPR, TIL, or ITM)
  target: id/name of image to edit
  source: id/name of image to copy

(imageNow "map, target, source")
Same as (image), but applied immediately instead of after dialog is closed.

(imagePal "map, target, palette")
Parameters:
  map:    Type of image (SPR, TIL, or ITM)
  target: id/name of image to edit
  source: palette index (0 is bg, 1 is tiles, 2 is sprites/items, anything higher requires editing your game data to include more)

(imagePalNow "map, target, palette")
Same as (imagePal), but applied immediately instead of after dialog is closed.

Examples:
  (image "SPR, A, a")
  (imageNow "TIL, a, floor")
  (image "ITM, a, b")
  (imagePal "SPR, A, 1")
  (imagePalNow "TIL, floor, 2")

HOW TO USE:
  1. Copy-paste this script into a new script tag after the Bitsy source code.
     It should appear *before* any other mods that handle loading your game
     data so it executes *after* them (last-in first-out).

TIPS:
  - The player avatar is always a sprite with id "A"; you can edit your gamedata to give them a name for clarity
  - You can use the full names or shorthand of image types (e.g. "SPR" and "sprite" will both work)
  - The "source" images don't have to be placed anywhere; so long as they exist in the gamedata they'll work
  - This is a destructive operation! Unless you have a copy of an overwritten image, you won't be able to get it back during that run

NOTE: This uses parentheses "()" instead of curly braces "{}" around function
      calls because the Bitsy editor's fancy dialog window strips unrecognized
      curly-brace functions from dialog text. To keep from losing data, write
      these function calls with parentheses like the examples above.

      For full editor integration, you'd *probably* also need to paste this
      code at the end of the editor's `bitsy.js` file. Untested.
*/
(function (bitsy) {
'use strict';

bitsy = bitsy && bitsy.hasOwnProperty('default') ? bitsy['default'] : bitsy;

/**
@file utils
@summary miscellaneous bitsy utilities
@author Sean S. LeBlanc
*/

/*helper used to inject code into script tags based on a search string*/
function inject(searchString, codeToInject) {
	var args = [].slice.call(arguments);
	codeToInject = flatten(args.slice(1)).join('');

	// find the relevant script tag
	var scriptTags = document.getElementsByTagName('script');
	var scriptTag;
	var code;
	for (var i = 0; i < scriptTags.length; ++i) {
		scriptTag = scriptTags[i];
		var matchesSearch = scriptTag.textContent.indexOf(searchString) !== -1;
		var isCurrentScript = scriptTag === document.currentScript;
		if (matchesSearch && !isCurrentScript) {
			code = scriptTag.textContent;
			break;
		}
	}

	// error-handling
	if (!code) {
		throw 'Couldn\'t find "' + searchString + '" in script tags';
	}

	// modify the content
	code = code.replace(searchString, searchString + codeToInject);

	// replace the old script tag with a new one using our modified code
	var newScriptTag = document.createElement('script');
	newScriptTag.textContent = code;
	scriptTag.insertAdjacentElement('afterend', newScriptTag);
	scriptTag.remove();
}

/*
Helper for getting image by name or id

Args:
	name: id or name of image to return
	 map: map of images (e.g. `sprite`, `tile`, `item`)

Returns: the image in the given map with the given name/id
 */
function getImage(name, map) {
	var id = map.hasOwnProperty(name) ? name : Object.keys(map).find(function (e) {
		return map[e].name == name;
	});
	return map[id];
}

/**
 * Helper for getting an array with unique elements 
 * @param  {Array} array Original array
 * @return {Array}       Copy of array, excluding duplicates
 */
function unique(array) {
	return array.filter(function (item, idx) {
		return array.indexOf(item) === idx;
	});
}

function flatten(list) {
	if (!Array.isArray(list)) {
		return list;
	}

	return list.reduce(function (fragments, arg) {
		return fragments.concat(flatten(arg));
	}, []);
}

/**

@file kitsy-script-toolkit
@summary makes it easier and cleaner to run code before and after Bitsy functions or to inject new code into Bitsy script tags
@license WTFPL (do WTF you want)
@version 2.1.0
@requires Bitsy Version: 4.5, 4.6
@author @mildmojo

@description
HOW TO USE:
  import {before, after, inject, addDialogTag, addDeferredDialogTag} from "./helpers/kitsy-script-toolkit";

  before(targetFuncName, beforeFn);
  after(targetFuncName, afterFn);
  inject(searchString, codeFragment1[, ...codefragmentN]);
  addDialogTag(tagName, dialogFn);
  addDeferredDialogTag(tagName, dialogFn);

  For more info, see the documentation at:
  https://github.com/seleb/bitsy-hacks/wiki/Coding-with-kitsy
*/


// Examples: inject('names.sprite.set( name, id );', 'console.dir(names)');
//           inject('names.sprite.set( name, id );', 'console.dir(names);', 'console.dir(sprite);');
//           inject('names.sprite.set( name, id );', ['console.dir(names)', 'console.dir(sprite);']);
function inject$1(searchString, codeFragments) {
	var kitsy = kitsyInit();
	var args = [].slice.call(arguments);
	codeFragments = flatten(args.slice(1));

	kitsy.queuedInjectScripts.push({
		searchString: searchString,
		codeFragments: codeFragments
	});
}

// Ex: before('load_game', function run() { alert('Loading!'); });
//     before('show_text', function run(text) { return text.toUpperCase(); });
//     before('show_text', function run(text, done) { done(text.toUpperCase()); });
function before(targetFuncName, beforeFn) {
	var kitsy = kitsyInit();
	kitsy.queuedBeforeScripts[targetFuncName] = kitsy.queuedBeforeScripts[targetFuncName] || [];
	kitsy.queuedBeforeScripts[targetFuncName].push(beforeFn);
}

// Ex: after('load_game', function run() { alert('Loaded!'); });
function after(targetFuncName, afterFn) {
	var kitsy = kitsyInit();
	kitsy.queuedAfterScripts[targetFuncName] = kitsy.queuedAfterScripts[targetFuncName] || [];
	kitsy.queuedAfterScripts[targetFuncName].push(afterFn);
}

function kitsyInit() {
	// return already-initialized kitsy
	if (bitsy.kitsy) {
		return bitsy.kitsy;
	}

	// Initialize kitsy
	bitsy.kitsy = {
		queuedInjectScripts: [],
		queuedBeforeScripts: {},
		queuedAfterScripts: {}
	};

	var oldStartFunc = bitsy.startExportedGame;
	bitsy.startExportedGame = function doAllInjections() {
		// Only do this once.
		bitsy.startExportedGame = oldStartFunc;

		// Rewrite scripts and hook everything up.
		doInjects();
		applyAllHooks();

		// Start the game
		bitsy.startExportedGame.apply(this, arguments);
	};

	return bitsy.kitsy;
}


function doInjects() {
	bitsy.kitsy.queuedInjectScripts.forEach(function (injectScript) {
		inject(injectScript.searchString, injectScript.codeFragments);
	});
	_reinitEngine();
}

function applyAllHooks() {
	var allHooks = unique(Object.keys(bitsy.kitsy.queuedBeforeScripts).concat(Object.keys(bitsy.kitsy.queuedAfterScripts)));
	allHooks.forEach(applyHook);
}

function applyHook(functionName) {
	var superFn = bitsy[functionName];
	var superFnLength = superFn.length;
	var functions = [];
	// start with befores
	functions = functions.concat(bitsy.kitsy.queuedBeforeScripts[functionName] || []);
	// then original
	functions.push(superFn);
	// then afters
	functions = functions.concat(bitsy.kitsy.queuedAfterScripts[functionName] || []);

	// overwrite original with one which will call each in order
	bitsy[functionName] = function () {
		var args = [].slice.call(arguments);
		var i = 0;
		runBefore.apply(this, arguments);

		// Iterate thru sync & async functions. Run each, finally run original.
		function runBefore() {
			// All outta functions? Finish
			if (i === functions.length) {
				return;
			}

			// Update args if provided.
			if (arguments.length > 0) {
				args = [].slice.call(arguments);
			}

			if (functions[i].length > superFnLength) {
				// Assume funcs that accept more args than the original are
				// async and accept a callback as an additional argument.
				functions[i++].apply(this, args.concat(runBefore.bind(this)));
			} else {
				// run synchronously
				var newArgs = functions[i++].apply(this, args) || args;
				runBefore.apply(this, newArgs);
			}
		}
	};
}

function _reinitEngine() {
	// recreate the script and dialog objects so that they'll be
	// referencing the code with injections instead of the original
	bitsy.scriptModule = new bitsy.Script();
	bitsy.scriptInterpreter = bitsy.scriptModule.CreateInterpreter();

	bitsy.dialogModule = new bitsy.Dialog();
	bitsy.dialogRenderer = bitsy.dialogModule.CreateRenderer();
	bitsy.dialogBuffer = bitsy.dialogModule.CreateBuffer();
}


function addDialogFunction(tag, fn) {
	var kitsy = kitsyInit();
	kitsy.dialogFunctions = kitsy.dialogFunctions || {};
	if (kitsy.dialogFunctions[tag]) {
		throw new Error('The dialog function "' + tag + '" already exists.');
	}

	// Hook into game load and rewrite custom functions in game data to Bitsy format.
	before('load_game', function (game_data, startWithTitle) {
		// Rewrite custom functions' parentheses to curly braces for Bitsy's
		// interpreter. Unescape escaped parentheticals, too.
		var fixedGameData = game_data
		.replace(new RegExp("(^|[^\\\\])\\((" + tag + " \".+?\")\\)", "g"), "$1{$2}") // Rewrite (tag...) to {tag...}
		.replace(new RegExp("\\\\\\((" + tag + " \".+\")\\\\?\\)", "g"), "($1)"); // Rewrite \(tag...\) to (tag...)
		return [fixedGameData, startWithTitle];
	});

	kitsy.dialogFunctions[tag] = fn;
}

/**
 * Adds a custom dialog tag which executes the provided function.
 * For ease-of-use with the bitsy editor, tags can be written as
 * (tagname "parameters") in addition to the standard {tagname "parameters"}
 * 
 * Function is executed immediately when the tag is reached.
 *
 * @param {string}   tag Name of tag
 * @param {Function} fn  Function to execute, with signature `function(environment, parameters, onReturn){}`
 *                       environment: provides access to SetVariable/GetVariable (among other things, see Environment in the bitsy source for more info)
 *                       parameters: array containing parameters as string in first element (i.e. `parameters[0]`)
 *                       onReturn: function to call with return value (just call `onReturn(null);` at the end of your function if your tag doesn't interact with the logic system)
 */
function addDialogTag(tag, fn) {
	addDialogFunction(tag, fn);
	inject$1(
		'var functionMap = new Map();',
		'functionMap.set("' + tag + '", kitsy.dialogFunctions.' + tag + ');'
	);
}

/**
 * Adds a custom dialog tag which executes the provided function.
 * For ease-of-use with the bitsy editor, tags can be written as
 * (tagname "parameters") in addition to the standard {tagname "parameters"}
 * 
 * Function is executed after the dialog box.
 *
 * @param {string}   tag Name of tag
 * @param {Function} fn  Function to execute, with signature `function(environment, parameters){}`
 *                       environment: provides access to SetVariable/GetVariable (among other things, see Environment in the bitsy source for more info)
 *                       parameters: array containing parameters as string in first element (i.e. `parameters[0]`)
 */
function addDeferredDialogTag(tag, fn) {
	addDialogFunction(tag, fn);
	bitsy.kitsy.deferredDialogFunctions = bitsy.kitsy.deferredDialogFunctions || {};
	var deferred = bitsy.kitsy.deferredDialogFunctions[tag] = [];
	inject$1(
		'var functionMap = new Map();',
		'functionMap.set("' + tag + '", function(e, p, o){ kitsy.deferredDialogFunctions.' + tag + '.push({e:e,p:p}); o(null); });'
	);
	// Hook into the dialog finish event and execute the actual function
	after('onExitDialog', function () {
		while (deferred.length) {
			var args = deferred.shift();
			fn(args.e, args.p, args.o);
		}
	});
	// Hook into the game reset and make sure data gets cleared
	after('clearGameData', function () {
		deferred.length = 0;
	});
}

/**
@file edit image at runtime
@summary API for updating image data at runtime.
@author Sean S. LeBlanc
@description
Adds API for updating sprite, tile, and item data at runtime.

Individual frames of image data in bitsy are 8x8 1-bit 2D arrays in yx order
e.g. the default player is:
[
	[0,0,0,1,1,0,0,0],
	[0,0,0,1,1,0,0,0],
	[0,0,0,1,1,0,0,0],
	[0,0,1,1,1,1,0,0],
	[0,1,1,1,1,1,1,0],
	[1,0,1,1,1,1,0,1],
	[0,0,1,0,0,1,0,0],
	[0,0,1,0,0,1,0,0]
]
*/

/*
Args:
	   id: string id or name
	frame: animation frame (0 or 1)
	  map: map of images (e.g. `sprite`, `tile`, `item`)

Returns: a single frame of a image data
*/
function getImageData(id, frame, map) {
	return bitsy.imageStore.source[getImage(id, map).drw][frame];
}

/*
Updates a single frame of image data

Args:
	     id: string id or name
	  frame: animation frame (0 or 1)
	    map: map of images (e.g. `sprite`, `tile`, `item`)
	newData: new data to write to the image data
*/
function setImageData(id, frame, map, newData) {
	var drawing = getImage(id, map);
	var drw = drawing.drw;
	bitsy.imageStore.source[drw][frame] = newData;
	if (drawing.animation.isAnimated) {
		drw += "_" + frame;
	}
	for (var pal in bitsy.palette) {
		if (bitsy.palette.hasOwnProperty(pal)) {
			var col = drawing.col;
			var colStr = "" + col;
			bitsy.imageStore.render[pal][colStr][drw] = bitsy.imageDataFromImageSource(newData, pal, col);
		}
	}
}



// map of maps
var maps = {
  spr: bitsy.sprite,
  sprite: bitsy.sprite,
  til: bitsy.tile,
  tile: bitsy.tile,
  itm: bitsy.item,
  item: bitsy.item,
};

function editImage(environment, parameters, onReturn) {
  var i;

  // parse parameters
  var params = parameters[0].split(/,\s?/);
  params[0] = (params[0] || "").toLowerCase();
  var mapId = params[0];
  var tgtId = params[1];
  var srcId = params[2];

  if (!mapId || !tgtId || !srcId) {
    throw new Error('Image expects three parameters: "map, target, source", but received: "' + parameters.join(', ') + '"');
  }

  // get objects
  var mapObj = maps[mapId];
  if (!mapObj) {
    throw new Error('Invalid map "' + mapId + '". Try "SPR", "TIL", or "ITM" instead.');
  }
  var tgtObj = getImage(tgtId, mapObj);
  if (!tgtObj) {
    throw new Error('Target "' + tgtId + '" was not the id/name of a ' + mapId + '.');
  }
  var srcObj = getImage(srcId, mapObj);
  if (!srcObj) {
    throw new Error('Source "' + srcId + '" was not the id/name of a ' + mapId + '.');
  }

  // copy animation from target to source
  tgtObj.animation = {
    frameCount: srcObj.animation.frameCount,
    isAnimated: srcObj.animation.isAnimated,
    frameIndex: srcObj.animation.frameIndex
  };
  for (i = 0; i < srcObj.animation.frameCount; ++i) {
    setImageData(tgtId, i, mapObj, getImageData(srcId, i, mapObj));
  }

  // done
  if (onReturn) {
    onReturn(null);
  }
}

function editPalette(environment, parameters, onReturn) {
  // parse parameters
  var params = parameters[0].split(/,\s?/);
  var mapId = params[0];
  var tgtId = params[1];
  var palId = params[2];

  if (!mapId || !tgtId || !palId) {
    throw new Error('Image expects three parameters: "map, target, palette", but received: "' + parameters.join(', ') + '"');
  }

  // get objects
  var mapObj = maps[mapId];
  if (!mapObj) {
    throw new Error('Invalid map "' + mapId + '". Try "SPR", "TIL", or "ITM" instead.');
  }
  var tgtObj = getImage(tgtId, mapObj);
  if (!tgtObj) {
    throw new Error('Target "' + tgtId + '" was not the id/name of a ' + mapId + '.');
  }
  var palObj = parseInt(palId);
  if (isNaN(palObj)) {
    throw new Error('Palette "' + palId + '" was not a number.');
  }

  // set palette
  tgtObj.col = palObj;

  // update images in cache
  bitsy.renderImageForAllPalettes(tgtObj);

  // done
  if (onReturn) {
    onReturn(null);
  }
}

// hook up the dialog tags
addDeferredDialogTag('image', editImage);
addDialogTag('imageNow', editImage);

addDeferredDialogTag('imagePal', editPalette);
addDialogTag('imagePalNow', editPalette);

}(window));