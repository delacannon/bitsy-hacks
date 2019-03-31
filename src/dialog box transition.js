/**
@file dialog box transition
@summary Smooth transition for Dialog Box
@license MIT
@version 1.0.0
@author Delacannon

@description
A hack that adds a easing transition to display dialog box text

HOW TO USE:
1. Copy-paste this script into a script tag after the bitsy source.
*/

import { inject } from "./helpers/kitsy-script-toolkit";

export var hackOptions = {
	easing: 0.025 //  easing speed
};

var drawOverride = `
if(context == null) return;
		if (isCentered) {
			context.putImageData(textboxInfo.img, textboxInfo.left*scale, ((height/2)-(textboxInfo.height/2))*scale);
			this.onExit = ((height/2)-(textboxInfo.height/2))*scale === ((height/2)-(textboxInfo.height/2))*scale
		}
		else if (player().y < mapsize/2) {
			easingDialog(textboxInfo, ${hackOptions.easing}, 
				!this.onClose ? (height-textboxInfo.bottom-textboxInfo.height)*scale
				: (height+textboxInfo.bottom+textboxInfo.height)*scale
				 ) 
			this.onExit = this.onClose && textboxInfo.y >= (height+textboxInfo.height)*scale
		}
		else {
			easingDialog(textboxInfo, ${
				hackOptions.easing
			}, !this.onClose ? textboxInfo.top*scale : 
				-textboxInfo.top-textboxInfo.height*scale) 
			 this.onExit = this.onClose && textboxInfo.y <= -textboxInfo.height*scale
		}
return;`;

var functionEasing = `
	function easingDialog(tbox, easing, targetY) {
		var vy = (targetY - tbox.y) * easing || 0.025;
		tbox.y += vy;
		context.putImageData(tbox.img,tbox.left*scale,tbox.y);
	}
	this.onClose = false;
	this.onExit = false;
`;

inject(
	/(this\.DrawTextbox\(\))/,
	`$1\nif(this.onExit && this.onClose){dialogBuffer.EndDialog()}`
);
inject(/(this\.EndDialog\(\))/, `dialogRenderer.onClose=true`);
inject(/(var DialogRenderer = function\(\) {)/, `$1${functionEasing}`);
inject(/(var textboxInfo = {)/, `$1y:0,`);
inject(
	/(this\.Reset = function\(\) {)/,
	`$1 this.onClose=false;
		this.onExit=false;
		textboxInfo.y = player().y < mapsize/2 ? (height+textboxInfo.bottom+textboxInfo.height)*scale : -(textboxInfo.height) * scale;`
);

inject(/(this\.DrawTextbox = function\(\) {)/, `$1${drawOverride}`);