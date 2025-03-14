/**
 * Babel plugin to tree-shake code annotated with @employee-code
 * 
 * This plugin removes:
 * 1. Import statements prefixed with //@employee-code
 * 2. JSX elements with comments containing @employee-code
 * 3. Variable declarations and expressions with @employee-code comments
 */
module.exports = function(babel) {
  const { types: t } = babel;
  
  // Keep track of removed imports so we can also remove their references
  const removedImports = new Set();
  
  // Critical modules and imports that should never be removed
  const CRITICAL_MODULES = [
    'react',
    'react-native',
    'react/jsx-runtime',
    'react/jsx-dev-runtime'
  ];
  
  // Critical import specifiers that should never be removed or modified
  const CRITICAL_IMPORTS = [
    'StyleSheet',
    'View',
    'Text',
    '_jsx',
    '_jsxs',
    '_jsxDEV',
    'Fragment',
    'jsx',
    'jsxs',
    'createElement'
  ];
  
  // Helper function to check if an import is critical and should never be removed
  const isCriticalImport = (source, importedNames) => {
    if (CRITICAL_MODULES.includes(source)) {
      return true;
    }
    
    if (source === 'react-native' && importedNames.some(name => CRITICAL_IMPORTS.includes(name))) {
      return true;
    }
    
    if (importedNames.some(name => CRITICAL_IMPORTS.includes(name))) {
      return true;
    }
    
    return false;
  };

  // Helper function to check if a comment contains @employee-code
  const isEmployeeCodeComment = (comment) => {
    return comment && comment.value && comment.value.includes('@employee-code');
  };
  
  // Helper to check if any comment in an array contains @employee-code
  const hasEmployeeCodeComment = (comments) => {
    if (!comments || !Array.isArray(comments)) return false;
    return comments.some(comment => isEmployeeCodeComment(comment));
  };
  
  // Finds all employee code comments and their line numbers in the file
  const findEmployeeCodeCommentLines = (path) => {
    const commentLines = new Set();
    const comments = path.hub.file.ast.comments || [];
    
    comments.forEach(comment => {
      if (isEmployeeCodeComment(comment) && comment.loc) {
        // Add only the exact line and the one after for JSX (more strict)
        const lineNum = comment.loc.start.line;
        commentLines.add(lineNum);
        commentLines.add(lineNum + 1);
      }
    });
    
    return commentLines;
  };
  
  /**
   * Check if node should be removed based on @employee-code annotations
   * More strict criteria to avoid removing regular code
   */
  const shouldRemoveNode = (path, employeeCodeLines) => {
    // Direct node comments - this is the most reliable way to mark code for removal
    const leadingComments = path.node.leadingComments || [];
    const trailingComments = path.node.trailingComments || [];
    
    if (hasEmployeeCodeComment([...leadingComments, ...trailingComments])) {
      // Special case for import declarations
      if (t.isImportDeclaration(path.node)) {
        const importSource = path.node.source.value;
        const importSpecifiers = path.node.specifiers || [];
        
        // Get the names of all imported items
        const importedNames = importSpecifiers.map(spec => {
          if (spec.imported) {
            return spec.local ? spec.local.name : spec.imported.name;
          } else if (spec.local) {
            return spec.local.name;
          }
          return null;
        }).filter(Boolean);
        
        // Never remove critical imports
        if (isCriticalImport(importSource, importedNames)) {
          return false;
        }
        
        // Store the removed imports so we can also remove their references
        importedNames.forEach(name => {
          if (!CRITICAL_IMPORTS.includes(name)) {
            removedImports.add(name);
          }
        });
      }
      
      return true;
    }
    
    // JSX specific checks - be more careful here
    if (t.isJSXElement(path.node)) {
      // Check for comments in the opening element - must be directly on this element
      if (path.node.openingElement) {
        if (hasEmployeeCodeComment(path.node.openingElement.leadingComments) || 
            hasEmployeeCodeComment(path.node.openingElement.trailingComments)) {
          return true;
        }
      }
      
      // Check if this is using a removed import
      const elementName = path.node.openingElement?.name?.name;
      if (elementName && removedImports.has(elementName)) {
        return true;
      }
      
      // Be very specific about JSX elements - only remove if they're exactly on or 
      // immediately after an @employee-code comment line
      if (path.node.loc && employeeCodeLines) {
        const startLine = path.node.loc.start.line;
        if (employeeCodeLines.has(startLine)) {
          return true;
        }
      }
    }
    
    // Handle styled containers - only if they explicitly use a style marked with @employee-code
    if (t.isJSXElement(path.node)) {
      const openingElement = path.node.openingElement;
      if (openingElement && openingElement.attributes) {
        const hasStyleProp = openingElement.attributes.some(attr => 
          t.isJSXAttribute(attr) && 
          attr.name.name === 'style' && 
          t.isJSXExpressionContainer(attr.value) && 
          t.isMemberExpression(attr.value.expression) && 
          t.isIdentifier(attr.value.expression.object) &&
          t.isIdentifier(attr.value.expression.property) &&
          removedImports.has('styles.' + attr.value.expression.property.name));
        
        if (hasStyleProp) {
          return true;
        }
      }
    }
    
    // Import declarations with comments above them - direct relationship only
    if (t.isImportDeclaration(path.node)) {
      const prevSibling = path.getPrevSibling();
      
      if (prevSibling.node && 
          (hasEmployeeCodeComment(prevSibling.node?.leadingComments) || 
           hasEmployeeCodeComment(prevSibling.node?.trailingComments))) {
        const importSource = path.node.source.value;
        const importSpecifiers = path.node.specifiers || [];
        
        // Get the names of all imported items
        const importedNames = importSpecifiers.map(spec => {
          if (spec.imported) {
            return spec.local ? spec.local.name : spec.imported.name;
          } else if (spec.local) {
            return spec.local.name;
          }
          return null;
        }).filter(Boolean);

        // Never remove critical imports
        if (isCriticalImport(importSource, importedNames)) {
          return false;
        }
        
        // Store the removed imports
        importedNames.forEach(name => {
          if (!CRITICAL_IMPORTS.includes(name)) {
            removedImports.add(name);
          }
        });
        
        return true;
      }
    }
    
    // Handle variables that reference removed imports
    if (t.isVariableDeclarator(path.node) && t.isIdentifier(path.node.init)) {
      const initName = path.node.init.name;
      if (removedImports.has(initName)) {
        const id = path.node.id;
        if (id && id.name) {
          removedImports.add(id.name);
        }
        return true;
      }
    }
    
    // Check logical expressions (e.g., IS_EMPLOYEE_MODE && ...)
    if (t.isLogicalExpression(path.node) && path.node.operator === '&&') {
      const leftName = path.node.left?.name;
      if (leftName && removedImports.has(leftName)) {
        return true;
      }
    }
    
    // Remove JSXExpressionContainer with employee mode checks - only if specifically marked
    if (t.isJSXExpressionContainer(path.node)) {
      if (t.isLogicalExpression(path.node.expression) && 
          path.node.expression.operator === '&&' && 
          t.isIdentifier(path.node.expression.left)) {
        const leftName = path.node.expression.left.name;
        if (leftName && (removedImports.has(leftName) || leftName === 'IS_EMPLOYEE_MODE')) {
          return true;
        }
      }
    }
    
    return false;
  };
  
  // Helper function to replace references to removed imports
  const replaceWithEmptyIfNeeded = (path) => {
    if (path.removed) return;
    
    // Handle JSX expressions like {IS_EMPLOYEE_MODE && <Component/>}
    if (t.isJSXExpressionContainer(path.node) && 
        t.isLogicalExpression(path.node.expression) && 
        path.node.expression.operator === '&&') {
      
      const leftName = path.node.expression.left?.name;
      if (leftName === 'IS_EMPLOYEE_MODE') {
        path.replaceWith(t.jsxExpressionContainer(t.nullLiteral()));
      }
    }
    
    // Handle direct references to removed variables
    if (t.isIdentifier(path.node) && removedImports.has(path.node.name)) {
      // Never replace critical imports
      if (CRITICAL_IMPORTS.includes(path.node.name)) {
        return;
      }
      
      // Only replace identifiers that we know are from removed imports
      // and are not part of import declarations
      if (!t.isImportSpecifier(path.parent) && 
          !t.isImportDefaultSpecifier(path.parent)) {
        path.replaceWith(t.identifier('undefined'));
      }
    }
  };
  
  return {
    name: 'tree-shake-employee-code',
    visitor: {
      Program: {
        enter(path) {
          // Find all @employee-code comment lines for enhanced detection
          const employeeCodeLines = findEmployeeCodeCommentLines(path);
          
          // Find all variables marked with @employee-code
          path.traverse({
            VariableDeclaration(varPath) {
              // Only directly marked declarations
              if (hasEmployeeCodeComment(varPath.node.leadingComments) || 
                  hasEmployeeCodeComment(varPath.node.trailingComments)) {
                // Track removed variables
                const declarations = varPath.node.declarations || [];
                declarations.forEach(decl => {
                  if (decl.id && decl.id.name) {
                    // Don't track critical imports even if they're marked with @employee-code
                    if (!CRITICAL_IMPORTS.includes(decl.id.name)) {
                      removedImports.add(decl.id.name);
                    }
                  }
                });
                
                varPath.remove();
              }
            },
            
            // Find employee-only styles in StyleSheet.create
            CallExpression(callPath) {
              if (callPath.node.callee &&
                  t.isMemberExpression(callPath.node.callee) &&
                  callPath.node.callee.object.name === 'StyleSheet' &&
                  callPath.node.callee.property.name === 'create') {
                
                // Check for object properties with @employee-code comments
                const styleObj = callPath.node.arguments[0];
                if (t.isObjectExpression(styleObj)) {
                  styleObj.properties.forEach(prop => {
                    if (hasEmployeeCodeComment(prop.leadingComments || []) ||
                        hasEmployeeCodeComment(prop.trailingComments || [])) {
                      // Track these style names to remove elements using them
                      if (prop.key && prop.key.name) {
                        removedImports.add('styles.' + prop.key.name);
                      }
                    }
                  });
                }
              }
            }
          });
        },
        
        // Last pass to log results
        exit(path) {
          if (removedImports.size > 0) {
            console.log(`Tree-shaking: Removed employee code components: ${Array.from(removedImports).join(', ')}`);
          }
        }
      },
      
      ImportDeclaration(path) {
        // Special handling for JSX runtime imports
        const importSource = path.node.source.value;
        if (importSource === 'react/jsx-runtime' || importSource === 'react/jsx-dev-runtime') {
          return;
        }
        
        // Much stricter checking - only remove if directly annotated
        const hasDirectComment = hasEmployeeCodeComment(path.node.leadingComments) || 
                              hasEmployeeCodeComment(path.node.trailingComments);
        
        const prevSibling = path.getPrevSibling();
        const hasPrevComment = prevSibling.node && 
                             (hasEmployeeCodeComment(prevSibling.node.leadingComments) || 
                              hasEmployeeCodeComment(prevSibling.node.trailingComments));
        
        if (hasDirectComment || hasPrevComment) {
          const importSpecifiers = path.node.specifiers || [];
          const importedNames = importSpecifiers.map(spec => {
            if (spec.imported) {
              return spec.local ? spec.local.name : spec.imported.name;
            } else if (spec.local) {
              return spec.local.name;
            }
            return null;
          }).filter(Boolean);
          
          // Never remove critical imports
          if (isCriticalImport(importSource, importedNames)) {
            return;
          }
          
          // Store removed imports
          importedNames.forEach(name => {
            if (!CRITICAL_IMPORTS.includes(name)) {
              removedImports.add(name);
            }
          });
          
          path.remove();
        }
      },
      
      JSXElement(path) {
        // Get all employee code comment lines
        const employeeCodeLines = findEmployeeCodeCommentLines(path);
        
        // Special handling for JSX elements with employee code comments
        // Be much more selective about which JSX elements we remove
        if (shouldRemoveNode(path, employeeCodeLines)) {
          path.remove();
        } else {
          // Additional check for style props that reference employee-only styles
          const element = path.node.openingElement;
          if (element && element.attributes) {
            for (const attr of element.attributes) {
              if (t.isJSXAttribute(attr) && attr.name.name === 'style') {
                if (t.isJSXExpressionContainer(attr.value)) {
                  const expr = attr.value.expression;
                  
                  // Check for style references like styles.employeeSection
                  if (t.isMemberExpression(expr) && 
                      expr.object.name === 'styles' && 
                      removedImports.has('styles.' + expr.property.name)) {
                    path.remove();
                    break;
                  }
                }
              }
            }
          }
        }
      },
      
      JSXExpressionContainer(path) {
        // We only need employeeCodeLines for JSX elements, not for expression containers
        if (shouldRemoveNode(path, null)) {
          path.remove();
        } else {
          // Only replace references that we're confident about
          const hasDirectComment = hasEmployeeCodeComment(path.node.leadingComments) || 
                                hasEmployeeCodeComment(path.node.trailingComments);
                                
          if (hasDirectComment) {
            replaceWithEmptyIfNeeded(path);
          }
        }
      },
      
      LogicalExpression(path) {
        // Only remove logical expressions with IS_EMPLOYEE_MODE if explicitly annotated
        const hasDirectComment = hasEmployeeCodeComment(path.node.leadingComments) || 
                              hasEmployeeCodeComment(path.node.trailingComments);
                              
        if (hasDirectComment && 
            path.node.operator === '&&' && 
            t.isIdentifier(path.node.left) && 
            path.node.left.name === 'IS_EMPLOYEE_MODE') {
          path.replaceWith(t.booleanLiteral(false));
        }
      },
      
      FunctionDeclaration(path) {
        // Only remove functions that are directly annotated
        const hasDirectComment = hasEmployeeCodeComment(path.node.leadingComments) || 
                              hasEmployeeCodeComment(path.node.trailingComments);
                              
        if (hasDirectComment) {
          path.remove();
        }
      },
      
      VariableDeclaration(path) {
        // Only remove variable declarations that are directly annotated
        const hasDirectComment = hasEmployeeCodeComment(path.node.leadingComments) || 
                              hasEmployeeCodeComment(path.node.trailingComments);
                              
        if (hasDirectComment) {
          // Track removed variables
          const declarations = path.node.declarations || [];
          declarations.forEach(decl => {
            if (decl.id && decl.id.name) {
              removedImports.add(decl.id.name);
            }
          });
          
          path.remove();
        }
      },
      
      ExpressionStatement(path) {
        // Only remove expressions that are directly annotated
        const hasDirectComment = hasEmployeeCodeComment(path.node.leadingComments) || 
                              hasEmployeeCodeComment(path.node.trailingComments);
                              
        if (hasDirectComment) {
          path.remove();
        }
      },
      
      ObjectProperty(path) {
        // Only remove properties that are directly annotated
        const hasDirectComment = hasEmployeeCodeComment(path.node.leadingComments) || 
                              hasEmployeeCodeComment(path.node.trailingComments);
                              
        if (hasDirectComment) {
          // If this is a style definition in StyleSheet.create, track it
          if (path.parent && t.isObjectExpression(path.parent) &&
              path.parentPath.parent && t.isCallExpression(path.parentPath.parent) &&
              path.parentPath.parent.callee &&
              t.isMemberExpression(path.parentPath.parent.callee) &&
              path.parentPath.parent.callee.object.name === 'StyleSheet') {
            
            if (path.node.key && path.node.key.name) {
              removedImports.add('styles.' + path.node.key.name);
            }
          }
          
          path.remove();
        }
      },
      
      ClassProperty(path) {
        // Only remove class properties that are directly annotated
        const hasDirectComment = hasEmployeeCodeComment(path.node.leadingComments) || 
                              hasEmployeeCodeComment(path.node.trailingComments);
                              
        if (hasDirectComment) {
          path.remove();
        }
      },
      
      // Handle identifier references to removed imports
      Identifier(path) {
        // Never modify critical imports
        if (CRITICAL_IMPORTS.includes(path.node.name)) {
          return;
        }
        
        // Only replace identifiers that we know are from removed imports
        if (removedImports.has(path.node.name) && 
            !t.isImportSpecifier(path.parent) && 
            !t.isImportDefaultSpecifier(path.parent)) {
          replaceWithEmptyIfNeeded(path);
        }
      }
    }
  };
};