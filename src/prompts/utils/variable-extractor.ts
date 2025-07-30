export interface ExtractedVariable {
  name: string;
  suggestedType?: string;
  defaultValue?: any;
}

export class VariableExtractor {
  private static readonly VARIABLE_PATTERN = /\{\{([^}]+)\}\}/g;
  private static readonly TYPE_SUGGESTIONS: Record<string, string> = {
    id: 'string',
    ids: 'string[]',
    name: 'string',
    email: 'string',
    url: 'string',
    date: 'Date',
    time: 'Date',
    count: 'number',
    amount: 'number',
    price: 'number',
    enabled: 'boolean',
    active: 'boolean',
    items: 'array',
    list: 'array',
  };

  static extractVariables(template: string): ExtractedVariable[] {
    const variables = new Map<string, ExtractedVariable>();
    let match;

    while ((match = this.VARIABLE_PATTERN.exec(template)) !== null) {
      const variableName = match[1].trim();

      if (!variables.has(variableName)) {
        variables.set(variableName, {
          name: variableName,
          suggestedType: this.suggestType(variableName),
        });
      }
    }

    return Array.from(variables.values());
  }

  static interpolateVariables(
    template: string,
    variables: Record<string, any>,
  ): string {
    return template.replace(
      this.VARIABLE_PATTERN,
      (match, variableName: string) => {
        const trimmedName = variableName.trim();
        const value = variables[trimmedName];

        if (value === undefined) {
          return match; // Keep the original placeholder if no value provided
        }

        if (value === null) {
          return '';
        }

        if (typeof value === 'object') {
          return JSON.stringify(value);
        }

        return String(value);
      },
    );
  }

  static validateVariables(
    template: string,
    providedVariables: Record<string, any>,
  ): {
    isValid: boolean;
    missingVariables: string[];
    unusedVariables: string[];
  } {
    const requiredVariables = this.extractVariables(template).map(
      (v) => v.name,
    );
    const providedKeys = Object.keys(providedVariables);

    const missingVariables = requiredVariables.filter(
      (v) => !providedKeys.includes(v),
    );
    const unusedVariables = providedKeys.filter(
      (v) => !requiredVariables.includes(v),
    );

    return {
      isValid: missingVariables.length === 0,
      missingVariables,
      unusedVariables,
    };
  }

  private static suggestType(variableName: string): string | undefined {
    const lowerName = variableName.toLowerCase();

    // Check exact matches first
    if (this.TYPE_SUGGESTIONS[lowerName]) {
      return this.TYPE_SUGGESTIONS[lowerName];
    }

    // Check if variable name contains type hints
    for (const [key, type] of Object.entries(this.TYPE_SUGGESTIONS)) {
      if (lowerName.includes(key)) {
        return type;
      }
    }

    // Default to string if no type can be inferred
    return 'string';
  }

  static previewPrompt(
    template: string,
    variables: Record<string, any>,
  ): {
    preview: string;
    validation: ReturnType<typeof VariableExtractor.validateVariables>;
  } {
    const validation = this.validateVariables(template, variables);
    const preview = this.interpolateVariables(template, variables);

    return {
      preview,
      validation,
    };
  }
}
