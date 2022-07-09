"use babel";

import AtomPicGoView from "./atom-picgo-view";

import { PicGo } from "picgo";
const picgo = new PicGo(atom.config.get("atom-picgo.picgoConfig"));
console.log(atom.config.get("atom-picgo.picgoConfig"));

import { CompositeDisposable } from "atom";

function paste() {
  let clipboard = require("electron").clipboard;
  let editor = atom.workspace.getActiveTextEditor();
  //if (editor.getPath().substr(-3) !== '.md') {console.log("not a md file");return}
  console.log("TestImg was toggled!");

  var fs = require("fs");

  let tempFilePath = null;
  let removeFile = () => tempFilePath && fs.unlinkSync(tempFilePath);
  try {
    if (clipboard.readImage().isEmpty())
      return atom.notifications.addInfo("No image in clipboard", {
        dismissable: true
      }); // not image
    //if is image the start to upload
    //first insert text to md
    let placeHolderText = `uploading...`;
    // add placeholder
    editor.insertText(`${placeHolderText}`, editor);
    let suffix = clipboard.readText().replace(/(.*)+(?=\.)/, "");

    // electron clipboard can not supports gifs
    let buffer = null;
    switch (suffix) {
      case ".jpg":
      case ".jpeg":
        buffer = clipboard.readImage().toJPEG(100);
        break;
      case ".png":
      default:
        buffer = clipboard.readImage().toPNG();
    }
    let randomFileName =
        ((Math.random() * 1e6) | 0).toString(32) + (suffix || ".png");
    tempFilePath = __dirname + randomFileName;

    fs.writeFileSync(tempFilePath, Buffer.from(buffer));

    const path = tempFilePath;

    console.log("start");
    console.log(path);
    atom.notifications.addInfo("Uploading image.");
    picgo
        .upload([path])
        .then(imgUrl => {
          console.log(imgUrl);
          console.log(imgUrl[0].imgUrl);
          atom.notifications.addSuccess("Image Uploaded!", {
            description: imgUrl[0].imgUrl,
            dismissable: true
          });
          editor.scan(new RegExp(placeHolderText), tools =>
              tools.replace("![]("+imgUrl[0].imgUrl+")")
          );
          removeFile();
        })
        .catch(e => {
          atom.notifications.addError("Upload failed!", {
            description: "Error Dump",
            detail: e,
            dismissable: true
          });
          editor.scan(new RegExp(placeHolderText), tools => tools.replace(""));
          removeFile();
        });
  } catch (e) {
    console.error(e);
    atom.notifications.addFatalError("Unexpected Error!", {
      description: "Error Dump",
      detail: e,
      dismissable: true
    });
    editor.scan(new RegExp(placeHolderText), tools => tools.replace(""));
    removeFile();
  }
}

export default {
  atomPicGoView: null,
  modalPanel: null,
  subscriptions: null,

  activate(state) {
    this.atomPicGoView = new AtomPicGoView(state.atomPicGoViewState);
    this.modalPanel = atom.workspace.addModalPanel({
      item: this.atomPicGoView.getElement(),
      visible: false
    });

    // Events subscribed to in atom's system can be easily cleaned up with a CompositeDisposable
    this.subscriptions = new CompositeDisposable();

    // Register command that toggles this view
    this.subscriptions.add(
        atom.commands.add("atom-workspace", {
          "atom-picgo:toggle": () => this.toggle()
        })
    );
  },

  deactivate() {
    this.modalPanel.destroy();
    this.subscriptions.dispose();
    this.atomPicGoView.destroy();
  },

  serialize() {
    return {
      atomPicGoViewState: this.atomPicGoView.serialize()
    };
  },

  toggle() {
    paste();
  },

  config: {
    picgoConfig: {
      type: "string",
      description: "Enter full path to PicGo config",
      default: "./picgo.json"
    }
  }
};
