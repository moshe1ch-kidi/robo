
// Initialize Blockly Setup

// --- CONSTANTS ---
export const HAT_BLOCKS = [
    'event_program_start', 
    'event_when_message', 
    'event_when_obstacle', 
    'event_when_color', 
    'event_when_ultrasonic'
];

// Canonical map for common color names to their representative hex values (aligned with Blockly icons)
const CANONICAL_COLOR_MAP_FOR_BLOCKLY: Record<string, string> = {
    'red': '#EF4444',     // From Blockly's red star
    'green': '#22C55E',   // From Blockly's green square
    'blue': '#3B82F6',    // From Blockly's blue circle
    'yellow': '#EAB308',  // From Blockly's yellow triangle (Blockly's specific yellow)
    'orange': '#F97316',  // From Blockly's orange heart
    'purple': '#A855F7',  // From Blockly's purple moon
    'cyan': '#06B6D4',    // From Blockly's cyan cloud
    'magenta': '#EC4899', // From Blockly's pink diamond (using magenta as the name in code)
    'black': '#000000',
    'white': '#FFFFFF',
};

// --- MESSAGE ICONS (SVG DATA URIs) ---
const MSG_ICONS = {
    RED_STAR: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ef4444'%3E%3Cpath d='M12 1.7l3.09 6.26 6.91 1-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14l-5-4.87 6.91-1z'/%3E%3C/svg%3E",
    BLUE_CIRCLE: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%233b82f6'%3E%3Ccircle cx='12' cy='12' r='10'/%3E%3C/svg%3E",
    GREEN_SQUARE: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2322c55e'%3E%3Crect x='3' y='3' width='18' height='18' rx='2'/%3E%3C/svg%3E",
    YELLOW_TRIANGLE: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23eab308'%3E%3Cpath d='M1 21h22L12 2z'/%3E%3C/svg%3E",
    ORANGE_HEART: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23f97316'%3E%3Cpath d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'/%3E%3C/svg%3E",
    PURPLE_MOON: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23a855f7'%3E%3Cpath d='M12 3c.132 0 .263 0 .393.007a9 9 0 0 0 9.257 9.257c.01 1.056-.11 2.115-.365 3.15a9 9 0 1 1-9.285-12.414z'/%3E%3C/svg%3E",
    CYAN_CLOUD: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%2306b6d4'%3E%3Cpath d='M17.5 19c-3.037 0-5.5-2.463-5.5-5.5 0-.154.007-.306.021-.456a5.5 5.5 0 0 0-10.021 2.456C2 18.537 4.463 21 7.5 21h10c1.933 0 3.5-1.567 3.5-3.5S19.433 14 17.5 14c-.154 0-.306.007-.456.021a5.501 5.501 0 0 0-3.544-7.021 5.5 5.5 0 0 0-10.021 2.456'/%3E%3C/svg%3E",
    PINK_DIAMOND: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23ec4899'%3E%3Cpath d='M12 2L4 12l8 10 8-10L12 2z'/%3E%3C/svg%3E"
};

const DROPDOWN_OPTIONS = [
    [{src: MSG_ICONS.RED_STAR, width: 24, height: 24, alt: "Red Star"}, "RED_STAR"],
    [{src: MSG_ICONS.BLUE_CIRCLE, width: 24, height: 24, alt: "Blue Circle"}, "BLUE_CIRCLE"],
    [{src: MSG_ICONS.GREEN_SQUARE, width: 24, height: 24, alt: "Green Square"}, "GREEN_SQUARE"],
    [{src: MSG_ICONS.YELLOW_TRIANGLE, width: 24, height: 24, alt: "Yellow Triangle"}, "YELLOW_TRIANGLE"],
    [{src: MSG_ICONS.ORANGE_HEART, width: 24, height: 24, alt: "Orange Heart"}, "ORANGE_HEART"],
    [{src: MSG_ICONS.PURPLE_MOON, width: 24, height: 24, alt: "Purple Moon"}, "PURPLE_MOON"],
    [{src: MSG_ICONS.CYAN_CLOUD, width: 24, height: 24, alt: "Cyan Cloud"}, "CYAN_CLOUD"],
    [{src: MSG_ICONS.PINK_DIAMOND, width: 24, height: 24, alt: "Pink Diamond"}, "PINK_DIAMOND"]
];

// --- SCRATCH THEME DEFINITION ---
export const getScratchTheme = () => {
  const Blockly = (window as any).Blockly;
  if (!Blockly) return null;

  return Blockly.Theme.defineTheme('scratch', {
    'base': Blockly.Themes.Classic,
    'blockStyles': {
      'motion_blocks': {
        'colourPrimary': '#4C97FF',
        'colourSecondary': '#4280D7',
        'colourTertiary': '#3373CC'
      },
      'looks_blocks': {
        'colourPrimary': '#9966FF',
        'colourSecondary': '#855CD6',
        'colourTertiary': '#774DCB'
      },
      'pen_blocks': {
        'colourPrimary': '#0FBD8C',
        'colourSecondary': '#0DA57A',
        'colourTertiary': '#0B8E69'
      },
      'events_blocks': {
        'colourPrimary': '#FFBF00',
        'colourSecondary': '#E6AC00',
        'colourTertiary': '#CC9900'
      },
      'control_blocks': {
        'colourPrimary': '#FFAB19',
        'colourSecondary': '#EC9C13',
        'colourTertiary': '#CF8B17'
      },
      'sensors_blocks': {
        'colourPrimary': '#00C7E5',
        'colourSecondary': '#00B8D4',
        'colourTertiary': '#00ACC1'
      },
      'logic_blocks': {
        'colourPrimary': '#59C059',
        'colourSecondary': '#46B946',
        'colourTertiary': '#389438'
      },
      'math_blocks': {
          'colourPrimary': '#59C059',
          'colourSecondary': '#46B946',
          'colourTertiary': '#389438'
      },
      'variable_blocks': {
          'colourPrimary': '#FF8C1A',
          'colourSecondary': '#FF8000',
          'colourTertiary': '#DB6E00'
      },
      'variable_dynamic_blocks': {
          'colourPrimary': '#FF8C1A',
          'colourSecondary': '#FF8000',
          'colourTertiary': '#DB6E00'
      }
    },
    'categoryStyles': {
      'motion_category': { 'colour': '#4C97FF' },
      'looks_category': { 'colour': '#9966FF' },
      'pen_category': { 'colour': '#0FBD8C' },
      'events_category': { 'colour': '#FFBF00' },
      'control_category': { 'colour': '#FFAB19' },
      'sensors_category': { 'colour': '#00C7E5' },
      'logic_category': { 'colour': '#59C059' },
      'variables_category': { 'colour': '#FF8C1A' }
    },
    'componentStyles': {
      'workspaceBackgroundColour': '#F9F9F9',
      'toolboxBackgroundColour': '#FFFFFF',
      'toolboxForegroundColour': '#575E75',
      'flyoutBackgroundColour': '#F9F9F9',
      'flyoutOpacity': 1,
      'scrollbarColour': '#CECDCE',
      'insertionMarkerColour': '#000000',
      'insertionMarkerOpacity': 0.2,
      'cursorColour': '#000000',
    },
    'fontStyle': {
      'family': '"Rubik", "Helvetica Neue", Helvetica, sans-serif',
      'weight': 'bold',
      'size': 11,
    }
  });
};

export const initBlockly = () => {
  const Blockly = (window as any).Blockly;
  const javascript = (window as any).javascript;
  const python = (window as any).python;
  
  if (!Blockly || !javascript || !python) {
    console.error("Blockly generators not loaded");
    return;
  }
  
  const javascriptGenerator = javascript.javascriptGenerator;
  const pythonGenerator = python.pythonGenerator;

  const wrapHatCode = (code: string) => {
      return `try {\n${code}\n} catch(e) { if (e.message !== "Simulation aborted") console.error('Script error:', e); }`;
  };

  const getSafeVarName = (block: any, fieldName: string, generator: any) => {
      const varId = block.getFieldValue(fieldName);
      return generator.nameDB_.getName(varId, 'VARIABLE');
  };

  class FieldNumpad extends Blockly.FieldNumber {
    constructor(value?: any, min?: any, max?: any, precision?: any, validator?: any) {
        super(value, min, max, precision, validator);
    }
    showEditor_() {
        if (window.showBlocklyNumpad) {
            window.showBlocklyNumpad(this.getValue(), (newValue) => { this.setValue(newValue); });
        } else { super.showEditor_(); }
    }
  }

  class FieldDropperColor extends Blockly.FieldColour {
    constructor(value?: string, validator?: Function) { super(value, validator); }
    showEditor_() {
        const pickerDiv = document.createElement('div');
        pickerDiv.className = 'p-3 bg-white rounded-xl shadow-xl border-2 border-slate-100 flex flex-col gap-3 min-w-[160px]';
        const grid = document.createElement('div');
        grid.className = 'grid grid-cols-4 gap-2';
        // Updated colors to align with CANONICAL_COLOR_MAP_FOR_BLOCKLY for better consistency
        const colors = [
            CANONICAL_COLOR_MAP_FOR_BLOCKLY['red'],
            CANONICAL_COLOR_MAP_FOR_BLOCKLY['green'],
            CANONICAL_COLOR_MAP_FOR_BLOCKLY['blue'],
            CANONICAL_COLOR_MAP_FOR_BLOCKLY['yellow'],
            CANONICAL_COLOR_MAP_FOR_BLOCKLY['orange'],
            CANONICAL_COLOR_MAP_FOR_BLOCKLY['purple'],
            CANONICAL_COLOR_MAP_FOR_BLOCKLY['cyan'],
            CANONICAL_COLOR_MAP_FOR_BLOCKLY['magenta'],
            CANONICAL_COLOR_MAP_FOR_BLOCKLY['white'],
            CANONICAL_COLOR_MAP_FOR_BLOCKLY['black'],
        ];
        colors.forEach(c => {
            const btn = document.createElement('button');
            btn.className = 'w-8 h-8 rounded-lg border border-slate-200 transition-transform hover:scale-110 active:scale-95 shadow-sm';
            btn.style.backgroundColor = c;
            btn.onclick = () => { this.setValue(c); Blockly.DropDownDiv.hideIfOwner(this); };
            grid.appendChild(btn);
        });
        pickerDiv.appendChild(grid);
        const dropperBtn = document.createElement('button');
        dropperBtn.className = 'flex items-center justify-center gap-2 w-full py-2.5 bg-pink-50 hover:bg-pink-100 text-pink-600 rounded-xl font-bold transition-all border border-pink-100 shadow-sm';
        dropperBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="m2 22 5-5"/><path d="M9.5 14.5 16 8l3 3-6.5 6.5-3-3z"/><path d="m18 6 3-3"/><path d="M20.9 7.1a2 2 0 1 0-2.8-2.8l-1.4 1.4 2.8 2.8 1.4-1.4z"/></svg><span class="text-xs uppercase tracking-tight">Pick from Stage</span>`;
        dropperBtn.onclick = () => { Blockly.DropDownDiv.hideIfOwner(this); if (window.showBlocklyColorPicker) { window.showBlocklyColorPicker((newColor: string) => { this.setValue(newColor); }); } };
        pickerDiv.appendChild(dropperBtn);
        Blockly.DropDownDiv.getContentDiv().appendChild(pickerDiv);
        Blockly.DropDownDiv.setColour('#ffffff', '#ffffff');
        Blockly.DropDownDiv.showPositionedByField(this, () => {});
    }
  }

  Blockly.fieldRegistry.register('field_numpad', FieldNumpad);
  Blockly.fieldRegistry.register('field_dropper_color', FieldDropperColor);

  // --- DEFINE BLOCKS ---

  Blockly.Blocks['event_program_start'] = {
    init: function() {
      this.appendDummyInput().appendField("when").appendField(new Blockly.FieldImage("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='%234C97FF' stroke='%234C97FF' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z'/%3E%3Cline x1='4' y1='22' x2='4' y2='15'/%3E%3C/svg%3E", 20, 20, "Flag")).appendField("clicked");
      this.setNextStatement(true, null); this.setStyle('events_blocks');
    }
  };

  Blockly.Blocks['event_when_message'] = {
    init: function() {
        this.appendDummyInput().appendField("when message").appendField(new Blockly.FieldDropdown(DROPDOWN_OPTIONS), "MESSAGE").appendField("received");
        this.appendStatementInput("DO"); this.setStyle('events_blocks');
    }
  };

  Blockly.Blocks['event_send_message'] = {
    init: function() {
        this.appendDummyInput().appendField("broadcast").appendField(new Blockly.FieldDropdown(DROPDOWN_OPTIONS), "MESSAGE");
        this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setStyle('events_blocks');
    }
  };

  Blockly.Blocks['event_when_obstacle'] = {
      init: function() {
          this.appendDummyInput().appendField("when obstacle detected");
          this.appendStatementInput("DO"); this.setStyle('events_blocks');
      }
  };

  Blockly.Blocks['event_when_color'] = {
      init: function() {
          this.appendDummyInput().appendField("when color").appendField(new FieldDropperColor(CANONICAL_COLOR_MAP_FOR_BLOCKLY['yellow']), "COLOR").appendField("detected"); // Default to canonical yellow
          this.appendStatementInput("DO"); this.setStyle('events_blocks');
      }
  };

  Blockly.Blocks['event_when_ultrasonic'] = {
    init: function() {
        this.appendDummyInput().appendField("when distance <").appendField(new FieldNumpad(20), "THRESHOLD").appendField("cm");
        this.appendStatementInput("DO"); this.setStyle('events_blocks');
    }
  };

  // --- MOTION ---

  Blockly.Blocks['robot_drive_simple'] = {
    init: function() {
      this.appendDummyInput().appendField("drive").appendField(new Blockly.FieldDropdown([["forward","FORWARD"], ["backward","BACKWARD"]]), "DIRECTION");
      this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setStyle('motion_blocks');
    }
  };

  Blockly.Blocks['robot_move'] = {
    init: function() {
      this.appendDummyInput().appendField("drive").appendField(new Blockly.FieldDropdown([["forward","FORWARD"], ["backward","BACKWARD"]]), "DIRECTION").appendField("distance").appendField(new FieldNumpad(10), "DISTANCE").appendField("cm");
      this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setStyle('motion_blocks'); 
    }
  };

  Blockly.Blocks['robot_move_speed'] = {
    init: function() {
      this.appendDummyInput().appendField("drive").appendField(new Blockly.FieldDropdown([["forward","FORWARD"], ["backward","BACKWARD"]]), "DIRECTION").appendField("distance").appendField(new FieldNumpad(10), "DISTANCE").appendField("cm at speed").appendField(new FieldNumpad(50, 0, 100), "SPEED").appendField("%");
      this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setStyle('motion_blocks'); 
    }
  };

  Blockly.Blocks['robot_motor_on'] = {
    init: function() {
      this.appendDummyInput().appendField("set motor").appendField(new Blockly.FieldDropdown([["left","LEFT"], ["right","RIGHT"], ["both","BOTH"]]), "MOTOR").appendField("direction").appendField(new Blockly.FieldDropdown([["forward","FORWARD"], ["backward","BACKWARD"], ["stop","STOP"]]), "DIR").appendField("power").appendField(new FieldNumpad(100, -100, 100), "POWER").appendField("%");
      this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setStyle('motion_blocks');
    }
  };

  Blockly.Blocks['robot_drive_until'] = {
    init: function() {
      this.appendDummyInput().appendField("drive").appendField(new Blockly.FieldDropdown([["forward","FORWARD"], ["backward","BACKWARD"]]), "DIRECTION").appendField("until");
      this.appendValueInput("CONDITION").setCheck("Boolean");
      this.appendDummyInput().appendField("at speed").appendField(new FieldNumpad(50, 0, 100), "SPEED").appendField("%");
      this.setInputsInline(true); this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setStyle('motion_blocks'); 
    }
  };

  Blockly.Blocks['robot_turn_until'] = {
    init: function() {
      this.appendDummyInput().appendField("turn").appendField(new Blockly.FieldDropdown([["left","LEFT"], ["right","RIGHT"]]), "DIRECTION").appendField("until");
      this.appendValueInput("CONDITION").setCheck("Boolean");
      this.appendDummyInput().appendField("at speed").appendField(new FieldNumpad(50, 0, 100), "SPEED").appendField("%");
      this.setInputsInline(true); this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setStyle('motion_blocks');
    }
  };
  
  Blockly.Blocks['robot_stop'] = {
      init: function() {
          this.appendDummyInput().appendField("stop moving");
          this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setStyle('motion_blocks');
      }
  };

  Blockly.Blocks['robot_turn'] = {
    init: function() {
      this.appendDummyInput()
          .appendField("turn")
          .appendField(new Blockly.FieldDropdown([["right","RIGHT"], ["left","LEFT"]]), "DIRECTION")
          .appendField("by")
          .appendField(new FieldNumpad(90), "ANGLE")
          .appendField("degrees at speed") // Added text for speed
          .appendField(new FieldNumpad(100, 0, 100), "SPEED") // Added speed input
          .appendField("%"); // Added percentage text
      this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setStyle('motion_blocks');
    }
  };

  Blockly.Blocks['robot_set_heading'] = {
    init: function() {
      this.appendDummyInput().appendField("set heading to").appendField(new FieldNumpad(0, 0, 360), "ANGLE").appendField("degrees");
      this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setStyle('motion_blocks');
    }
  };

  Blockly.Blocks['robot_set_speed'] = {
      init: function() {
          this.appendDummyInput().appendField("set speed to").appendField(new FieldNumpad(100, 0, 100), "SPEED").appendField("%");
          this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setStyle('motion_blocks');
      }
  };

  // --- PEN BLOCKS ---
  Blockly.Blocks['robot_pen_down'] = {
      init: function() {
          this.appendDummyInput().appendField("pen down");
          this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setStyle('pen_blocks');
      }
  };

  Blockly.Blocks['robot_pen_up'] = {
      init: function() {
          this.appendDummyInput().appendField("pen up");
          this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setStyle('pen_blocks');
      }
  };

  Blockly.Blocks['robot_pen_set_color'] = {
      init: function() {
          this.appendDummyInput().appendField("set pen color").appendField(new FieldDropperColor(CANONICAL_COLOR_MAP_FOR_BLOCKLY['black']), "COLOR"); // Default to canonical black
          this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setStyle('pen_blocks');
      }
  };

  Blockly.Blocks['robot_pen_clear'] = {
      init: function() {
          this.appendDummyInput().appendField("clear drawings");
          this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setStyle('pen_blocks');
      }
  };

  Blockly.Blocks['robot_led'] = {
    init: function() {
      this.appendDummyInput().appendField("set").appendField(new Blockly.FieldDropdown([["left","LEFT"], ["right","RIGHT"], ["both","BOTH"]]), "SIDE").appendField("LED to color").appendField(new FieldDropperColor(CANONICAL_COLOR_MAP_FOR_BLOCKLY['red']), "COLOR"); // Default to canonical red
      this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setStyle('looks_blocks');
    }
  };

  Blockly.Blocks['robot_led_set_color'] = {
    init: function() {
      this.appendDummyInput().appendField("set").appendField(new Blockly.FieldDropdown([["left","LEFT"], ["right","RIGHT"], ["both","BOTH"]]), "SIDE").appendField("LED");
      this.appendValueInput("COLOR").setCheck("String");
      this.setInputsInline(true); this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setStyle('looks_blocks');
    }
  };

  Blockly.Blocks['robot_led_off'] = {
    init: function() {
      this.appendDummyInput().appendField("turn").appendField(new Blockly.FieldDropdown([["left","LEFT"], ["right","RIGHT"], ["both","BOTH"]]), "SIDE").appendField("LED off");
      this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setStyle('looks_blocks');
    }
  };
  
  Blockly.Blocks['robot_wait'] = {
    init: function() {
      this.appendDummyInput().appendField("wait").appendField(new FieldNumpad(1), "SECONDS").appendField("seconds");
      this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setStyle('control_blocks');
    }
  };

  Blockly.Blocks['control_forever'] = {
    init: function() {
      this.appendDummyInput().appendField("forever"); this.appendStatementInput("DO");
      this.setPreviousStatement(true, null); this.setNextStatement(false); this.setStyle('control_blocks');
    }
  };

  Blockly.Blocks['control_wait_until'] = {
    init: function() {
      this.appendValueInput("CONDITION").setCheck("Boolean").appendField("wait until");
      this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setStyle('control_blocks');
    }
  };

  Blockly.Blocks['control_stop_program'] = {
    init: function() {
      this.appendDummyInput().appendField("stop program");
      this.setPreviousStatement(true, null); this.setNextStatement(false); this.setStyle('control_blocks');
    }
  };
  
  Blockly.Blocks['custom_if'] = {
    init: function() {
        this.appendValueInput('IF0').setCheck('Boolean').appendField("if"); this.appendStatementInput('DO0');
        this.setPreviousStatement(true); this.setNextStatement(true); this.setStyle('control_blocks');
    }
  };

  Blockly.Blocks['custom_if_else'] = {
    init: function() {
        this.appendValueInput('IF0').setCheck('Boolean').appendField("if"); this.appendStatementInput('DO0'); this.appendStatementInput('ELSE').appendField("else");
        this.setPreviousStatement(true); this.setNextStatement(true); this.setStyle('control_blocks');
    }
  };

  Blockly.Blocks['math_number'] = {
      init: function() {
        this.appendDummyInput().appendField(new FieldNumpad(0), 'NUM');
        this.setOutput(true, 'Number'); this.setStyle('math_blocks'); 
      }
  }

  Blockly.Blocks['math_round_down'] = {
    init: function() {
      this.appendValueInput("NUM").setCheck("Number").appendField("integer of");
      this.setOutput(true, "Number"); this.setStyle('logic_blocks');
    }
  };

  Blockly.Blocks['variables_get'] = {
    init: function() {
      this.appendDummyInput().appendField(new Blockly.FieldVariable('variable'), 'VAR');
      this.setOutput(true, null); this.setStyle('variable_blocks');
    }
  };

  Blockly.Blocks['variables_set'] = {
    init: function() {
      this.appendValueInput('VALUE').appendField('set').appendField(new Blockly.FieldVariable('variable'), 'VAR').appendField('to');
      this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setStyle('variable_blocks');
    }
  };

  Blockly.Blocks['math_change'] = {
    init: function() {
      this.appendValueInput('DELTA').appendField('change').appendField(new Blockly.FieldVariable('variable'), 'VAR').appendField('by');
      this.setPreviousStatement(true, null); this.setNextStatement(true, null); this.setStyle('variable_blocks');
    }
  };

  Blockly.Blocks['sensor_ultrasonic'] = {
    init: function() {
      this.appendDummyInput().appendField('distance from obstacle (cm)');
      this.setOutput(true, "Number"); this.setStyle('sensors_blocks');
    }
  };

  Blockly.Blocks['sensor_touch'] = {
    init: function() {
      this.appendDummyInput().appendField("touch sensor pressed?");
      this.setOutput(true, "Boolean"); this.setStyle('sensors_blocks');
    }
  };

  Blockly.Blocks['sensor_gyro'] = {
    init: function() {
      this.appendDummyInput().appendField("gyro").appendField(new Blockly.FieldDropdown([["angle", "ANGLE"], ["tilt", "TILT"]]), "MODE");
      this.setOutput(true, "Number"); this.setStyle('sensors_blocks');
    }
  };

  Blockly.Blocks['sensor_color'] = {
    init: function() {
      this.appendDummyInput().appendField("detected color");
      this.setOutput(true, "String"); this.setStyle('sensors_blocks');
    }
  };

  Blockly.Blocks['sensor_touching_color'] = {
    init: function() {
      this.appendDummyInput().appendField("touching color").appendField(new FieldDropperColor(CANONICAL_COLOR_MAP_FOR_BLOCKLY['yellow']), "COLOR").appendField("?"); // Default to canonical yellow
      this.setOutput(true, "Boolean"); this.setStyle('sensors_blocks');
    }
  };

  Blockly.Blocks['sensor_circumference'] = {
    init: function() {
      this.appendDummyInput().appendField('wheel circumference (cm)');
      this.setOutput(true, "Number"); this.setStyle('sensors_blocks');
    }
  };

  Blockly.Blocks['logic_negate'] = {
    init: function() {
      this.appendValueInput("BOOL").setCheck("Boolean").appendField("not");
      this.setOutput(true, "Boolean"); this.setStyle('logic_blocks');
    }
  };


  // --- DEFINE JAVASCRIPT GENERATORS ---

  javascriptGenerator.forBlock['event_program_start'] = function() { return ''; };
  javascriptGenerator.forBlock['event_when_message'] = function(block: any) { const msg = block.getFieldValue('MESSAGE'); const branch = javascriptGenerator.statementToCode(block, 'DO'); return `robot.onMessage('${msg}', async () => {\n${wrapHatCode(branch)}});\n`; };
  javascriptGenerator.forBlock['event_send_message'] = function(block: any) { const msg = block.getFieldValue('MESSAGE'); return `await robot.sendMessage('${msg}');\n`; };
  javascriptGenerator.forBlock['event_when_obstacle'] = function(block: any) { const branch = javascriptGenerator.statementToCode(block, 'DO'); return `robot.onObstacle(async () => {\n${wrapHatCode(branch)}});\n`; };
  javascriptGenerator.forBlock['event_when_color'] = function(block: any) { const color = block.getFieldValue('COLOR'); const branch = javascriptGenerator.statementToCode(block, 'DO'); return `robot.onColor('${color}', async () => {\n${wrapHatCode(branch)}});\n`; };
  javascriptGenerator.forBlock['event_when_ultrasonic'] = function(block: any) { const threshold = block.getFieldValue('THRESHOLD'); const branch = javascriptGenerator.statementToCode(block, 'DO'); return `robot.onDistance(${threshold}, async () => {\n${wrapHatCode(branch)}});\n`; };
  javascriptGenerator.forBlock['robot_drive_simple'] = function(block: any) { const direction = block.getFieldValue('DIRECTION'); const power = direction === 'FORWARD' ? 100 : -100; return `await robot.setMotorPower(${power}, ${power});\n`; };
  javascriptGenerator.forBlock['robot_move'] = function(block: any) { const direction = block.getFieldValue('DIRECTION'); const distance = block.getFieldValue('DISTANCE'); const distVal = direction === 'BACKWARD' ? -distance : distance; return `await robot.move(${distVal});\n`; };
  javascriptGenerator.forBlock['robot_move_speed'] = function(block: any) { const direction = block.getFieldValue('DIRECTION'); const distance = block.getFieldValue('DISTANCE'); const speed = block.getFieldValue('SPEED'); const distVal = direction === 'BACKWARD' ? -distance : distance; return `await robot.setSpeed(${speed});\nawait robot.move(${distVal});\n`; };
  javascriptGenerator.forBlock['robot_motor_on'] = function(block: any) { const motor = block.getFieldValue('MOTOR'); const dir = block.getFieldValue('DIR'); const power = block.getFieldValue('POWER'); const powerVal = dir === 'STOP' ? 0 : (dir === 'BACKWARD' ? -power : power); if (motor === 'LEFT') return `await robot.setMotorPower(${powerVal}, 0);\n`; if (motor === 'RIGHT') return `await robot.setMotorPower(0, ${powerVal});\n`; return `await robot.setMotorPower(${powerVal}, ${powerVal});\n`; };
  javascriptGenerator.forBlock['robot_drive_until'] = function(block: any) { const direction = block.getFieldValue('DIRECTION'); const speed = block.getFieldValue('SPEED'); const condition = javascriptGenerator.valueToCode(block, 'CONDITION', javascriptGenerator.ORDER_NONE) || 'false'; const motorPower = direction === 'BACKWARD' ? -100 : 100; return `await robot.setSpeed(${speed});\nawait robot.setMotorPower(${motorPower}, ${motorPower});\nwhile (!(${condition})) { await robot.wait(10); }\nawait robot.stop();\n`; };
  javascriptGenerator.forBlock['robot_turn_until'] = function(block: any) { const direction = block.getFieldValue('DIRECTION'); const speed = block.getFieldValue('SPEED'); const condition = javascriptGenerator.valueToCode(block, 'CONDITION', javascriptGenerator.ORDER_NONE) || 'false'; const leftPower = direction === 'LEFT' ? -100 : 100; const rightPower = direction === 'LEFT' ? 100 : -100; return `await robot.setSpeed(${speed});\nawait robot.setMotorPower(${leftPower}, ${rightPower});\nwhile (!(${condition})) { await robot.wait(10); }\nawait robot.stop();\n`; };
  javascriptGenerator.forBlock['robot_stop'] = function() { return 'await robot.stop();\n'; };
  javascriptGenerator.forBlock['robot_turn'] = function(block: any) { 
    const direction = block.getFieldValue('DIRECTION'); 
    const angle = block.getFieldValue('ANGLE'); 
    const speed = block.getFieldValue('SPEED'); // Get the new speed field value
    const angVal = direction === 'LEFT' ? angle : -angle; 
    return `await robot.setSpeed(${speed});\nawait robot.turn(${angVal});\n`; 
  };
  javascriptGenerator.forBlock['robot_set_heading'] = function(block: any) { const angle = block.getFieldValue('ANGLE'); return `await robot.setHeading(${angle});\n`; };
  javascriptGenerator.forBlock['robot_set_speed'] = function(block: any) { const speed = block.getFieldValue('SPEED'); return `await robot.setSpeed(${speed});\n`; };
  javascriptGenerator.forBlock['robot_pen_down'] = function() { return 'await robot.setPen(true);\n'; };
  javascriptGenerator.forBlock['robot_pen_up'] = function() { return 'await robot.setPen(false);\n'; };
  javascriptGenerator.forBlock['robot_pen_set_color'] = function(block: any) { const color = block.getFieldValue('COLOR'); return `await robot.setPenColor('${color}');\n`; };
  javascriptGenerator.forBlock['robot_pen_clear'] = function() { return 'await robot.clearPen();\n'; };
  javascriptGenerator.forBlock['robot_led'] = function(block: any) { const side = block.getFieldValue('SIDE'); const color = block.getFieldValue('COLOR'); const sideVal = side ? side.toLowerCase() : 'both'; return `robot.setLed('${sideVal}', '${color}');\n`; };
  javascriptGenerator.forBlock['robot_led_set_color'] = function(block: any) { const side = block.getFieldValue('SIDE'); const color = javascriptGenerator.valueToCode(block, 'COLOR', javascriptGenerator.ORDER_ATOMIC) || "'black'"; const sideVal = side ? side.toLowerCase() : 'both'; return `robot.setLed('${sideVal}', ${color});\n`; };
  javascriptGenerator.forBlock['robot_led_off'] = function(block: any) { const side = block.getFieldValue('SIDE'); const sideVal = side ? side.toLowerCase() : 'both'; return `robot.setLed('${sideVal}', 'black');\n`; };
  javascriptGenerator.forBlock['robot_wait'] = function(block: any) { const seconds = block.getFieldValue('SECONDS'); return `await robot.wait(${seconds * 1000});\n`; };
  javascriptGenerator.forBlock['control_forever'] = function(block: any) { const branch = javascriptGenerator.statementToCode(block, 'DO'); return `while (true) {\n${branch}  await robot.wait(10);\n}\n`; };
  javascriptGenerator.forBlock['control_wait_until'] = function(block: any) { const condition = javascriptGenerator.valueToCode(block, 'CONDITION', javascriptGenerator.ORDER_ATOMIC) || 'false'; return `while (!(${condition})) {\n  await robot.wait(10);\n}\n`; };
  javascriptGenerator.forBlock['control_stop_program'] = function() { return 'await robot.stopProgram();\n'; };
  javascriptGenerator.forBlock['controls_repeat_ext'] = function(block: any) { const repeats = javascriptGenerator.valueToCode(block, 'TIMES', javascriptGenerator.ORDER_ASSIGNMENT) || '0'; const branch = javascriptGenerator.statementToCode(block, 'DO'); const gen = javascriptGenerator; const loopVar = gen.nameDB_ ? gen.nameDB_.getDistinctName('count', 'VARIABLE') : 'i'; return `for (let ${loopVar} = 0; ${loopVar} < ${repeats}; ${loopVar}++) {\n${branch}}\n`; };
  javascriptGenerator.forBlock['custom_if'] = function(block: any) { const condition = javascriptGenerator.valueToCode(block, 'IF0', javascriptGenerator.ORDER_NONE) || 'false'; const branchDo = javascriptGenerator.statementToCode(block, 'DO0'); return `if (${condition}) {\n${branchDo}}\n`; };
  javascriptGenerator.forBlock['custom_if_else'] = function(block: any) { const condition = javascriptGenerator.valueToCode(block, 'IF0', javascriptGenerator.ORDER_NONE) || 'false'; const branchDo = javascriptGenerator.statementToCode(block, 'DO0'); const branchElse = javascriptGenerator.statementToCode(block, 'ELSE'); return `if (${condition}) {\n${branchDo}} else {\n${branchElse}}\n`; };
  javascriptGenerator.forBlock['math_number'] = function(block: any) { const code = parseFloat(block.getFieldValue('NUM')); const order = code >= 0 ? javascriptGenerator.ORDER_ATOMIC : javascriptGenerator.ORDER_UNARY_NEGATION; return [code, order]; }
  javascriptGenerator.forBlock['math_round_down'] = function(block: any) { const num = javascriptGenerator.valueToCode(block, 'NUM', javascriptGenerator.ORDER_NONE) || '0'; return [`Math.floor(${num})`, javascriptGenerator.ORDER_FUNCTION_CALL]; };
  javascriptGenerator.forBlock['variables_get'] = function(block: any) { const varName = getSafeVarName(block, 'VAR', javascriptGenerator); return [varName, javascriptGenerator.ORDER_ATOMIC]; };
  javascriptGenerator.forBlock['variables_set'] = function(block: any) { const varName = getSafeVarName(block, 'VAR', javascriptGenerator); const argument0 = javascriptGenerator.valueToCode(block, 'VALUE', javascriptGenerator.ORDER_ASSIGNMENT) || '0'; return `${varName} = ${argument0};\nrobot.updateVariable('${varName}', ${varName});\n`; };
  javascriptGenerator.forBlock['math_change'] = function(block: any) { const varName = getSafeVarName(block, 'VAR', javascriptGenerator); const argument0 = javascriptGenerator.valueToCode(block, 'DELTA', javascriptGenerator.ORDER_ADDITION) || '0'; return `${varName} = (Number(${varName}) || 0) + ${argument0};\nrobot.updateVariable('${varName}', ${varName});\n`; };
  javascriptGenerator.forBlock['sensor_ultrasonic'] = function() { return ['await robot.getDistance()', javascriptGenerator.ORDER_AWAIT || javascriptGenerator.ORDER_ATOMIC]; };
  javascriptGenerator.forBlock['sensor_touch'] = function() { return ['await robot.getTouch()', javascriptGenerator.ORDER_AWAIT || javascriptGenerator.ORDER_ATOMIC]; };
  javascriptGenerator.forBlock['sensor_gyro'] = function(block: any) { const mode = block.getFieldValue('MODE'); return [`await robot.getGyro('${mode}')`, javascriptGenerator.ORDER_AWAIT || javascriptGenerator.ORDER_ATOMIC]; };
  javascriptGenerator.forBlock['sensor_color'] = function() { return ['await robot.getColor()', javascriptGenerator.ORDER_AWAIT || javascriptGenerator.ORDER_ATOMIC]; };
  javascriptGenerator.forBlock['sensor_touching_color'] = function(block: any) { const color = block.getFieldValue('COLOR'); return [`await robot.isTouchingColor('${color}')`, javascriptGenerator.ORDER_AWAIT || javascriptGenerator.ORDER_ATOMIC]; };
  javascriptGenerator.forBlock['sensor_circumference'] = function() { return ['await robot.getCircumference()', javascriptGenerator.ORDER_AWAIT || javascriptGenerator.ORDER_ATOMIC]; };
  javascriptGenerator.forBlock['logic_negate'] = function(block: any) { const argument0 = javascriptGenerator.valueToCode(block, 'BOOL', javascriptGenerator.ORDER_LOGICAL_NOT) || 'true'; const code = '!' + argument0; return [code, javascriptGenerator.ORDER_LOGICAL_NOT]; };

  javascriptGenerator.workspaceToCode = function(workspace: any) {
    this.init(workspace);
    let initCode = ''; const vars = workspace.getAllVariables();
    if (vars.length > 0) { vars.forEach((v: any) => { const name = this.nameDB_.getName(v.name, 'VARIABLE'); initCode += `var ${name} = 0;\nrobot.updateVariable('${name}', 0);\n`; }); initCode += '\n'; }
    const topBlocks = workspace.getTopBlocks(true);
    const hatBlocks = topBlocks.filter((b: any) => HAT_BLOCKS.includes(b.type));
    const startBlocks = hatBlocks.filter((b: any) => b.type === 'event_program_start');
    const listenerBlocks = hatBlocks.filter((b: any) => b.type !== 'event_program_start');
    const listenerCode = listenerBlocks.map((b: any) => this.blockToCode(b)).join('\n');
    const startScripts = startBlocks.map((b: any) => this.blockToCode(b));
    const parallelInvocations = startScripts.map((script: string) => `(async () => { \n${wrapHatCode(script)}\n })()`).join(',\n          ');
    let combinedCode = initCode + listenerCode;
    if (startScripts.length > 0) { combinedCode += `\n\nawait Promise.all([\n          ${parallelInvocations}\n        ]);\n`; }
    return this.finish(combinedCode);
  };

  // --- DEFINE PYTHON GENERATORS ---
  pythonGenerator.forBlock['event_program_start'] = function() { return `# Program starts here\n`; };
  pythonGenerator.forBlock['event_when_message'] = function(block: any) { const msg = block.getFieldValue('MESSAGE'); const branch = pythonGenerator.statementToCode(block, 'DO'); return `def on_message_${msg}():\n${branch || '  pass'}\n\nrobot.on_message('${msg}', on_message_${msg})\n`; };
  pythonGenerator.forBlock['event_send_message'] = function(block: any) { const msg = block.getFieldValue('MESSAGE'); return `robot.send_message('${msg}')\n`; };
  pythonGenerator.forBlock['event_when_obstacle'] = function(block: any) { const branch = pythonGenerator.statementToCode(block, 'DO'); return `def on_obstacle():\n${branch || '  pass'}\n\nrobot.on_obstacle(on_obstacle)\n`; };
  pythonGenerator.forBlock['event_when_color'] = function(block: any) { const color = block.getFieldValue('COLOR'); const branch = pythonGenerator.statementToCode(block, 'DO'); const funcSuffix = color.startsWith('#') ? color.replace('#', '') : color; return `def on_color_${funcSuffix}():\n${branch || '  pass'}\n\nrobot.on_color('${color}', on_color_${funcSuffix})\n`; };
  pythonGenerator.forBlock['event_when_ultrasonic'] = function(block: any) { const threshold = block.getFieldValue('THRESHOLD'); const branch = pythonGenerator.statementToCode(block, 'DO'); return `def on_distance_detected():\n${branch || '  pass'}\n\nrobot.on_distance(${threshold}, on_distance_detected)\n`; };
  pythonGenerator.forBlock['robot_drive_simple'] = function(block: any) { const direction = block.getFieldValue('DIRECTION'); const power = direction === 'FORWARD' ? 100 : -100; return `robot.set_motor_power(${power}, ${power})\n`; };
  pythonGenerator.forBlock['robot_move'] = function(block: any) { const direction = block.getFieldValue('DIRECTION'); const distance = block.getFieldValue('DISTANCE'); const distVal = direction === 'BACKWARD' ? -distance : distance; return `robot.move(${distVal})\n`; };
  pythonGenerator.forBlock['robot_move_speed'] = function(block: any) { const direction = block.getFieldValue('DIRECTION'); const distance = block.getFieldValue('DISTANCE'); const speed = block.getFieldValue('SPEED'); const distVal = direction === 'BACKWARD' ? -distance : distance; return `robot.set_speed(${speed})\nrobot.move(${distVal})\n`; };
  pythonGenerator.forBlock['robot_motor_on'] = function(block: any) { const motor = block.getFieldValue('MOTOR'); const dir = block.getFieldValue('DIR'); const power = block.getFieldValue('POWER'); const powerVal = dir === 'STOP' ? 0 : (dir === 'BACKWARD' ? -power : power); if (motor === 'LEFT') return `robot.set_motor_power(${powerVal}, 0)\n`; if (motor === 'RIGHT') return `robot.set_motor_power(0, ${powerVal})\n`; return `robot.set_motor_power(${powerVal}, ${powerVal})\n`; };
  pythonGenerator.forBlock['robot_drive_until'] = function(block: any) { const direction = block.getFieldValue('DIRECTION'); const speed = block.getFieldValue('SPEED'); const condition = pythonGenerator.valueToCode(block, 'CONDITION', pythonGenerator.ORDER_NONE) || 'False'; const motorPower = direction === 'BACKWARD' ? -100 : 100; return `robot.set_speed(${speed})\nrobot.set_motor_power(${motorPower}, ${motorPower})\nwhile not (${condition}):\n  robot.wait(0.01)\nrobot.stop()\n`; };
  pythonGenerator.forBlock['robot_turn_until'] = function(block: any) { const direction = block.getFieldValue('DIRECTION'); const speed = block.getFieldValue('SPEED'); const condition = pythonGenerator.valueToCode(block, 'CONDITION', pythonGenerator.ORDER_NONE) || 'False'; const leftPower = direction === 'LEFT' ? -100 : 100; const rightPower = direction === 'LEFT' ? 100 : -100; return `robot.set_speed(${speed})\nrobot.set_motor_power(${leftPower}, ${rightPower})\nwhile not (${condition}):\n  robot.wait(0.01)\nrobot.stop()\n`; };
  pythonGenerator.forBlock['robot_stop'] = function() { return 'robot.stop()\n'; };
  pythonGenerator.forBlock['robot_turn'] = function(block: any) { 
    const direction = block.getFieldValue('DIRECTION'); 
    const angle = block.getFieldValue('ANGLE'); 
    const speed = block.getFieldValue('SPEED'); // Get the new speed field value
    const angVal = direction === 'LEFT' ? angle : -angle; 
    return `robot.set_speed(${speed})\nrobot.turn(${angVal})\n`; 
  };
  pythonGenerator.forBlock['robot_set_heading'] = function(block: any) { const angle = block.getFieldValue('ANGLE'); return `robot.set_heading(${angle})\n`; };
  pythonGenerator.forBlock['robot_set_speed'] = function(block: any) { const speed = block.getFieldValue('SPEED'); return `robot.set_speed(${speed})\n`; };
  pythonGenerator.forBlock['robot_pen_down'] = function() { return 'robot.pen_down()\n'; };
  pythonGenerator.forBlock['robot_pen_up'] = function() { return 'robot.pen_up()\n'; };
  pythonGenerator.forBlock['robot_pen_set_color'] = function(block: any) { const color = block.getFieldValue('COLOR'); return `robot.set_pen_color('${color}')\n`; };
  pythonGenerator.forBlock['robot_pen_clear'] = function() { return 'robot.clear_pen()\n'; };
  pythonGenerator.forBlock['robot_led'] = function(block: any) { const side = block.getFieldValue('SIDE'); const color = block.getFieldValue('COLOR'); const sideLower = side ? side.toLowerCase() : 'both'; return `robot.set_led('${sideLower}', '${color}')\n`; };
  pythonGenerator.forBlock['robot_led_set_color'] = function(block: any) { const side = block.getFieldValue('SIDE'); const color = pythonGenerator.valueToCode(block, 'COLOR', pythonGenerator.ORDER_ATOMIC) || "'black'"; const sideLower = side ? side.toLowerCase() : 'both'; return `robot.set_led('${sideLower}', ${color})\n`; };
  pythonGenerator.forBlock['robot_led_off'] = function(block: any) { const side = block.getFieldValue('SIDE'); const sideLower = side ? side.toLowerCase() : 'both'; return `robot.set_led('${sideLower}', 'black')\n`; };
  pythonGenerator.forBlock['robot_wait'] = function(block: any) { const seconds = block.getFieldValue('SECONDS'); return `robot.wait(${seconds})\n`; };
  pythonGenerator.forBlock['control_forever'] = function(block: any) { const branch = pythonGenerator.statementToCode(block, 'DO'); return `while True:\n${branch || '  pass'}\n  robot.wait(0.01)\n`; };
  pythonGenerator.forBlock['control_wait_until'] = function(block: any) { const condition = pythonGenerator.valueToCode(block, 'CONDITION', pythonGenerator.ORDER_ATOMIC) || 'False'; return `while not (${condition}):\n  robot.wait(0.01)\n`; };
  pythonGenerator.forBlock['control_stop_program'] = function() { return 'robot.stop_program()\n'; };
  pythonGenerator.forBlock['controls_repeat_ext'] = function(block: any) { const repeats = pythonGenerator.valueToCode(block, 'TIMES', pythonGenerator.ORDER_NONE) || '0'; const branch = pythonGenerator.statementToCode(block, 'DO'); const loopVar = (this.nameDB_) ? this.nameDB_.getDistinctName('count', 'VARIABLE') : 'i'; return `for ${loopVar} in range(${repeats}):\n${branch || '  pass'}\n`; };
  pythonGenerator.forBlock['custom_if'] = function(block: any) { const condition = pythonGenerator.valueToCode(block, 'IF0', pythonGenerator.ORDER_NONE) || 'False'; const branchDo = pythonGenerator.statementToCode(block, 'DO0'); return `if ${condition}:\n${branchDo || '  pass'}\n`; };
  pythonGenerator.forBlock['custom_if_else'] = function(block: any) { const condition = pythonGenerator.valueToCode(block, 'IF0', pythonGenerator.ORDER_NONE) || 'False'; const branchDo = pythonGenerator.statementToCode(block, 'DO0'); const branchElse = pythonGenerator.statementToCode(block, 'ELSE'); return `if ${condition}:\n${branchDo || '  pass'}\nelse:\n${branchElse || '  pass'}\n`; };
  pythonGenerator.forBlock['math_number'] = function(block: any) { const code = parseFloat(block.getFieldValue('NUM')); const order = code >= 0 ? pythonGenerator.ORDER_ATOMIC : pythonGenerator.ORDER_UNARY_SIGN; return [code, order]; }
  pythonGenerator.forBlock['math_round_down'] = function(block: any) { const num = pythonGenerator.valueToCode(block, 'NUM', pythonGenerator.ORDER_NONE) || '0'; return [`int(${num})`, pythonGenerator.ORDER_FUNCTION_CALL]; };
  pythonGenerator.forBlock['variables_get'] = function(block: any) { const varName = getSafeVarName(block, 'VAR', pythonGenerator); return [varName, pythonGenerator.ORDER_ATOMIC]; };
  pythonGenerator.forBlock['variables_set'] = function(block: any) { const varName = getSafeVarName(block, 'VAR', pythonGenerator); const argument0 = pythonGenerator.valueToCode(block, 'VALUE', pythonGenerator.ORDER_NONE) || '0'; return `${varName} = ${argument0}\n`; };
  pythonGenerator.forBlock['math_change'] = function(block: any) { const varName = getSafeVarName(block, 'VAR', pythonGenerator); const argument0 = pythonGenerator.valueToCode(block, 'DELTA', pythonGenerator.ORDER_NONE) || '0'; return `${varName} += ${argument0}\n`; };
  pythonGenerator.forBlock['sensor_ultrasonic'] = function() { return ['robot.get_distance()', pythonGenerator.ORDER_FUNCTION_CALL || pythonGenerator.ORDER_ATOMIC]; };
  pythonGenerator.forBlock['sensor_touch'] = function() { return ['robot.is_touching()', pythonGenerator.ORDER_FUNCTION_CALL || pythonGenerator.ORDER_ATOMIC]; };
  pythonGenerator.forBlock['sensor_gyro'] = function(block: any) { const mode = block.getFieldValue('MODE'); const modeLower = mode ? mode.toLowerCase() : 'angle'; return [`robot.get_gyro('${modeLower}')`, pythonGenerator.ORDER_FUNCTION_CALL || pythonGenerator.ORDER_ATOMIC]; };
  pythonGenerator.forBlock['sensor_color'] = function() { return ['robot.get_color()', pythonGenerator.ORDER_FUNCTION_CALL || pythonGenerator.ORDER_ATOMIC]; };
  pythonGenerator.forBlock['sensor_touching_color'] = function(block: any) { const color = block.getFieldValue('COLOR'); return [`robot.is_touching_color('${color}')`, pythonGenerator.ORDER_FUNCTION_CALL || pythonGenerator.ORDER_ATOMIC]; };
  pythonGenerator.forBlock['sensor_circumference'] = function() { return ['robot.get_wheel_circumference()', pythonGenerator.ORDER_FUNCTION_CALL || pythonGenerator.ORDER_ATOMIC]; };
  pythonGenerator.forBlock['logic_negate'] = function(block: any) { const argument0 = pythonGenerator.valueToCode(block, 'BOOL', pythonGenerator.ORDER_LOGICAL_NOT) || 'True'; const code = 'not ' + argument0; return [code, pythonGenerator.ORDER_LOGICAL_NOT]; };

  pythonGenerator.workspaceToCode = function(workspace: any) {
      this.init(workspace); let initCode = 'import robot\n\n'; const vars = workspace.getAllVariables();
      if (vars.length > 0) { vars.forEach((v: any) => { const name = this.nameDB_.getName(v.name, 'VARIABLE'); initCode += `${name} = 0\n`; }); initCode += '\n'; }
      let contentCode = ''; const topBlocks = workspace.getTopBlocks(true); const hatBlocks = topBlocks.filter((b: any) => HAT_BLOCKS.includes(b.type));
      hatBlocks.forEach((b: any) => { contentCode += this.blockToCode(b) + '\n'; });
      return (initCode + contentCode).trim();
  };
};

// Refactor: Define toolbox config as a constant first, then export it.
// This is a stylistic change that can sometimes help with module resolution
// in certain build environments, though the original direct export was also valid.
const TOOLBOX_CONFIG = {
  kind: "categoryToolbox",
  contents: [
    {
      kind: "category",
      name: "Events",
      categorystyle: "events_category",
      cssConfig: { "container": "category-events" },
      contents: [
          { kind: "block", type: "event_program_start" },
          { kind: "block", type: "event_when_message" },
          { kind: "block", type: "event_send_message" },
          { kind: "block", type: "event_when_obstacle" },
          { kind: "block", type: "event_when_color" },
          { kind: "block", type: "event_when_ultrasonic" }
      ]
    },
    {
      kind: "category",
      name: "Motion",
      categorystyle: "motion_category",
      cssConfig: { "container": "category-motion" },
      contents: [
        { kind: "block", type: "robot_drive_simple" },
        { kind: "block", type: "robot_move" },
        { kind: "block", type: "robot_move_speed" }, 
        { kind: "block", type: "robot_motor_on" },
        { kind: "block", type: "robot_drive_until" },
        { kind: "block", type: "robot_turn_until" },
        { kind: "block", type: "robot_stop" },
        { kind: "block", type: "robot_turn" },
        { kind: "block", type: "robot_set_heading" },
        { kind: "block", type: "robot_set_speed" },
      ]
    },
    {
      kind: "category",
      name: "Pen",
      categorystyle: "pen_category",
      cssConfig: { "container": "category-pen" },
      contents: [
        { kind: "block", type: "robot_pen_down" },
        { kind: "block", type: "robot_pen_up" },
        { kind: "block", type: "robot_pen_set_color" },
        { kind: "block", type: "robot_pen_clear" },
      ]
    },
    {
      kind: "category",
      name: "Looks",
      categorystyle: "looks_category",
      cssConfig: { "container": "category-looks" },
      contents: [
        { kind: "block", type: "robot_led" },
        { kind: "block", type: "robot_led_set_color", inputs: { COLOR: { shadow: { type: "sensor_color" } } } },
        { kind: "block", type: "robot_led_off" },
      ]
    },
    {
      kind: "category",
      name: "Sensors",
      categorystyle: "sensors_category",
      cssConfig: { "container": "category-sensors" },
      contents: [
        { kind: "block", type: "sensor_ultrasonic" },
        { kind: "block", type: "sensor_touch" },
        { kind: "block", type: "sensor_gyro" },
        { kind: "block", type: "sensor_color" },
        { kind: "block", type: "sensor_touching_color" },
        { kind: "block", type: "sensor_circumference" },
      ]
    },
    {
      kind: "category",
      name: "Control",
      categorystyle: "control_category",
      cssConfig: { "container": "category-control" },
      contents: [
        { kind: "block", type: "robot_wait" },
        { kind: "block", type: "control_forever" },
        { kind: "block", type: "control_wait_until" },
        { kind: "block", type: "control_stop_program" },
        { kind: "block", type: "controls_repeat_ext", inputs: { TIMES: { shadow: { type: "math_number", fields: { NUM: 5 } } } } },
        { kind: "block", type: "custom_if" },
        { kind: "block", type: "custom_if_else" },
      ]
    },
    {
        kind: "category",
        name: "Logic",
        categorystyle: "logic_category",
        cssConfig: { "container": "category-logic" },
        contents: [
            { kind: "block", type: "logic_compare", inputs: { A: { shadow: { type: "math_number", fields: { NUM: 10 } } }, B: { shadow: { type: "math_number", fields: { NUM: 10 } } } } },
            { kind: "block", type: "logic_operation" },
            { kind: "block", type: "logic_boolean" },
            { kind: "block", type: "logic_negate" },
            { kind: "block", type: "math_round_down", inputs: { NUM: { shadow: { type: "math_number", fields: { NUM: 12.7 } } } } },
            { kind: "block", type: "math_arithmetic", inputs: { A: { shadow: { type: "math_number", fields: { NUM: 1 } } }, B: { shadow: { type: "math_number", fields: { NUM: 1 } } } } },
            { kind: "block", type: "math_number" },
        ]
    },
    {
      kind: "category",
      name: "Variables",
      categorystyle: "variables_category",
      custom: "VARIABLE",
      cssConfig: { "container": "category-variables" }
    }
  ]
};

export const toolbox = TOOLBOX_CONFIG;
