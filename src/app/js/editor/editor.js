if (typeof yasp == 'undefined') yasp = { };

(function() {
  var fireDataReceived;
  
  yasp.CompileManager = {
    lastCompile: null,
    compile: function(content, cb) {
      if (content != this.lastUpdate) {
        this.lastUpdate = content;
        console.log("update");
        yasp.AssemblerCommunicator.sendMessage("assemble", {
          code: content,
          jobs: ['symbols', 'map']
        }, function(response) {
          // update yasp.Editor
          if (!!response.payload) {
            yasp.Editor.map = response.payload.map;
            yasp.Editor.symbols = response.payload.symbols;
            
            fireDataReceived();
          }
          
          cb(response);
        });
      } else {
        cb(null);
      }
    }
  }
  yasp.CompileManager.compile = yasp.CompileManager.compile.bind(yasp.CompileManager);
  
  yasp.Editor = {
    map: { },
    symbols: {
      labels: { },
      instructions: { },
      usedRegisters: { }
    },
    labelText: ""
  };
  
  
  // yasp.EmulatorCommunicator = new yasp.Communicator("emulator/emulator.js");
  yasp.AssemblerCommunicator = new yasp.Communicator("app/js/assembler/assembler_backend.js");
  
  $('body').ready(function() {
    // initialize code mirror textarea
    var editor = CodeMirror.fromTextArea($('#editor').get(0), {
      mode: "text/assembler",
      theme: 'eclipse',
      lineNumbers: true,
      undoDepth: 100,
      autofocus: true,
      indentUnit: 8,
      tabSize: 8,
      indentWithTabs: true
    });
    
    
    // force intendation everytime something changes
    editor.on("change", function() {
      var c = editor.getCursor();
      if (!!c) {
        var content = editor.getLine(c.line);
        editor.indentLine(c.line);
        // fix bug introduced in Commit #32d7db0cf78f5ed9dde3450ad885ced98851271b that causes the input to be fucked up...
        if (editor.getLine(c.line) != content) {
          c.ch++; // if you ever add multiple levels of intendation this should be changed into somehting more intelligent
        }
        editor.setCursor(c);
        CodeMirror.commands.autocomplete(editor);
      }
    });
    
    // update symbols
    var UPDATE_DELAY = 500;
    var update, first = true;
    (update = function() {
      var content = editor.getValue();
      yasp.CompileManager.compile(content, function(result) {
        if (first) editor.setValue(content); // force update of existing labels
        first = false;
        
        setTimeout(update, UPDATE_DELAY)
      });
    })();
    
    // update label list
    fireDataReceived = function() {
      // build new label list text
      var text = "<ul>";
      var labels = yasp.Editor.symbols.labels;
      for (var l in labels) {
        text += "<li>" + l + "</li>";
      }
      text += "</ul>";
      
      $('#labelcontent').html(text);
    };
    
    // hinting
    (function() {
      var delimiters = yasp.Lexer.getDelimiters();
      CodeMirror.registerHelper("hint", "assembler", function(editor, options) {
        var cur = editor.getCursor(), curLine = editor.getLine(cur.line);
        var start = cur.ch, end = start;
        while (end < curLine.length && delimiters.indexOf(curLine.charAt(end)) == -1) ++end;
        while (start && delimiters.indexOf(curLine.charAt(start - 1)) == -1) --start;
        var curWord = start != end && curLine.slice(start, end);
        console.log(curWord);
      });

      CodeMirror.commands.autocomplete = function(cm) {
        CodeMirror.showHint(cm, CodeMirror.hint.assembler);
      };
    })();
  });
})();