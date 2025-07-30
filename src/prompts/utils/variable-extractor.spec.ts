import { VariableExtractor } from './variable-extractor';

describe('VariableExtractor', () => {
  describe('extractVariables', () => {
    it('should extract simple variables', () => {
      const template = 'Hello {{name}}, welcome to {{place}}!';
      const variables = VariableExtractor.extractVariables(template);

      expect(variables).toHaveLength(2);
      expect(variables[0]).toEqual({
        name: 'name',
        suggestedType: 'string',
      });
      expect(variables[1]).toEqual({
        name: 'place',
        suggestedType: 'string',
      });
    });

    it('should handle duplicate variables', () => {
      const template = 'Hello {{name}}, {{name}} is a great {{name}}!';
      const variables = VariableExtractor.extractVariables(template);

      expect(variables).toHaveLength(1);
      expect(variables[0]).toEqual({
        name: 'name',
        suggestedType: 'string',
      });
    });

    it('should suggest types based on variable names', () => {
      const template = '{{email}} {{count}} {{enabled}} {{items}}';
      const variables = VariableExtractor.extractVariables(template);

      expect(variables).toHaveLength(4);
      expect(variables[0].suggestedType).toBe('string');
      expect(variables[1].suggestedType).toBe('number');
      expect(variables[2].suggestedType).toBe('boolean');
      expect(variables[3].suggestedType).toBe('array');
    });

    it('should handle empty template', () => {
      const variables = VariableExtractor.extractVariables('');
      expect(variables).toHaveLength(0);
    });

    it('should handle template with no variables', () => {
      const template = 'Hello world!';
      const variables = VariableExtractor.extractVariables(template);
      expect(variables).toHaveLength(0);
    });
  });

  describe('interpolateVariables', () => {
    it('should interpolate variables correctly', () => {
      const template = 'Hello {{name}}, you are {{age}} years old!';
      const variables = { name: 'John', age: 30 };

      const result = VariableExtractor.interpolateVariables(
        template,
        variables,
      );
      expect(result).toBe('Hello John, you are 30 years old!');
    });

    it('should handle missing variables', () => {
      const template = 'Hello {{name}}, you are {{age}} years old!';
      const variables = { name: 'John' };

      const result = VariableExtractor.interpolateVariables(
        template,
        variables,
      );
      expect(result).toBe('Hello John, you are {{age}} years old!');
    });

    it('should handle null values', () => {
      const template = 'Hello {{name}}!';
      const variables = { name: null };

      const result = VariableExtractor.interpolateVariables(
        template,
        variables,
      );
      expect(result).toBe('Hello !');
    });

    it('should handle object values', () => {
      const template = 'Data: {{data}}';
      const variables = { data: { key: 'value' } };

      const result = VariableExtractor.interpolateVariables(
        template,
        variables,
      );
      expect(result).toBe('Data: {"key":"value"}');
    });

    it('should handle array values', () => {
      const template = 'Items: {{items}}';
      const variables = { items: ['a', 'b', 'c'] };

      const result = VariableExtractor.interpolateVariables(
        template,
        variables,
      );
      expect(result).toBe('Items: ["a","b","c"]');
    });
  });

  describe('validateVariables', () => {
    it('should validate all variables are provided', () => {
      const template = 'Hello {{name}}!';
      const variables = { name: 'John' };

      const result = VariableExtractor.validateVariables(template, variables);
      expect(result.isValid).toBe(true);
      expect(result.missingVariables).toHaveLength(0);
      expect(result.unusedVariables).toHaveLength(0);
    });

    it('should detect missing variables', () => {
      const template = 'Hello {{name}}, you are {{age}} years old!';
      const variables = { name: 'John' };

      const result = VariableExtractor.validateVariables(template, variables);
      expect(result.isValid).toBe(false);
      expect(result.missingVariables).toEqual(['age']);
      expect(result.unusedVariables).toHaveLength(0);
    });

    it('should detect unused variables', () => {
      const template = 'Hello {{name}}!';
      const variables = { name: 'John', age: 30, email: 'john@example.com' };

      const result = VariableExtractor.validateVariables(template, variables);
      expect(result.isValid).toBe(true);
      expect(result.missingVariables).toHaveLength(0);
      expect(result.unusedVariables).toEqual(['age', 'email']);
    });
  });

  describe('previewPrompt', () => {
    it('should preview prompt with validation', () => {
      const template = 'Hello {{name}}, welcome to {{place}}!';
      const variables = { name: 'John', place: 'San Francisco' };

      const result = VariableExtractor.previewPrompt(template, variables);

      expect(result.preview).toBe('Hello John, welcome to San Francisco!');
      expect(result.validation.isValid).toBe(true);
      expect(result.validation.missingVariables).toHaveLength(0);
      expect(result.validation.unusedVariables).toHaveLength(0);
    });

    it('should preview with validation errors', () => {
      const template = 'Hello {{name}}, welcome to {{place}}!';
      const variables = { name: 'John' };

      const result = VariableExtractor.previewPrompt(template, variables);

      expect(result.preview).toBe('Hello John, welcome to {{place}}!');
      expect(result.validation.isValid).toBe(false);
      expect(result.validation.missingVariables).toEqual(['place']);
    });
  });
});
