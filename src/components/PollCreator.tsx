import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Plus, BarChart3 } from "lucide-react";

interface PollCreatorProps {
  options: string[];
  onChange: (options: string[]) => void;
  onRemove: () => void;
}

const PollCreator = ({ options, onChange, onRemove }: PollCreatorProps) => {
  const addOption = () => {
    if (options.length < 4) {
      onChange([...options, ""]);
    }
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    onChange(newOptions);
  };

  const removeOption = (index: number) => {
    if (options.length > 2) {
      onChange(options.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="border border-border rounded-xl p-4 mt-3 bg-muted/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-primary">
          <BarChart3 className="h-4 w-4" />
          <span className="font-medium text-sm">Create Poll</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6"
          onClick={onRemove}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="space-y-2">
        {options.map((option, index) => (
          <div key={index} className="flex gap-2">
            <Input
              placeholder={`Option ${index + 1}`}
              value={option}
              onChange={(e) => updateOption(index, e.target.value)}
              className="flex-1"
            />
            {options.length > 2 && (
              <Button
                variant="ghost"
                size="icon"
                className="shrink-0"
                onClick={() => removeOption(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      {options.length < 4 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={addOption}
          className="mt-2 text-primary"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add option
        </Button>
      )}
    </div>
  );
};

export default PollCreator;
