import React, { useMemo, useRef } from 'react';
import ReactQuill, { Quill } from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import QuillBetterTable from 'quill-better-table';
import 'quill-better-table/dist/quill-better-table.css';
import { supabase } from '../lib/supabase';

// Registrar el módulo de tablas
Quill.register('modules/better-table', QuillBetterTable);

const RichTextEditor = ({ value, onChange, placeholder, className }) => {
    const quillRef = useRef(null);

    // Handler personalizado para imágenes
    const imageHandler = () => {
        const input = document.createElement('input');
        input.setAttribute('type', 'file');
        input.setAttribute('accept', 'image/*');
        input.click();

        input.onchange = async () => {
            const file = input.files[0];
            if (!file) return;

            const editor = quillRef.current.getEditor();
            const range = editor.getSelection(true);

            // Mostrar indicador de carga
            editor.insertEmbed(range.index, 'text', '⏳ Subiendo imagen...');
            editor.setSelection(range.index + 1);

            try {
                // Subir a Supabase Storage
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `editor-images/${fileName}`;

                const { error: uploadError } = await supabase.storage
                    .from('products')
                    .upload(filePath, file);

                if (uploadError) throw uploadError;

                // Obtener URL pública
                const { data } = supabase.storage
                    .from('products')
                    .getPublicUrl(filePath);

                // Eliminar texto de carga
                editor.deleteText(range.index, '⏳ Subiendo imagen...'.length);

                // Insertar imagen
                editor.insertEmbed(range.index, 'image', data.publicUrl);
                editor.setSelection(range.index + 1);
            } catch (error) {
                console.error('Error uploading image:', error);
                editor.deleteText(range.index, '⏳ Subiendo imagen...'.length);
                alert('Error al subir la imagen. Intenta con una URL o verifica el bucket de Supabase.');
            }
        };
    };

    // Handler para insertar imagen por URL
    const insertImageURL = () => {
        const url = prompt('Ingresa la URL de la imagen:');
        if (url) {
            const editor = quillRef.current.getEditor();
            const range = editor.getSelection(true);
            editor.insertEmbed(range.index, 'image', url);
            editor.setSelection(range.index + 1);
        }
    };

    const modules = useMemo(() => ({
        toolbar: {
            container: [
                [{ 'header': [1, 2, 3, false] }],
                ['bold', 'italic', 'underline', 'strike'],
                [{ 'list': 'ordered' }, { 'list': 'bullet' }],
                [{ 'indent': '-1' }, { 'indent': '+1' }],
                ['link', 'image', 'image-url'],
                [{ 'align': [] }],
                [{ 'color': [] }, { 'background': [] }],
                ['table'],
                ['clean']
            ],
            handlers: {
                image: imageHandler
            }
        },
        'better-table': {
            operationMenu: {
                items: {
                    insertColumnRight: {
                        text: 'Insertar columna a la derecha'
                    },
                    insertColumnLeft: {
                        text: 'Insertar columna a la izquierda'
                    },
                    insertRowUp: {
                        text: 'Insertar fila arriba'
                    },
                    insertRowDown: {
                        text: 'Insertar fila abajo'
                    },
                    mergeCells: {
                        text: 'Combinar celdas'
                    },
                    unmergeCells: {
                        text: 'Separar celdas'
                    },
                    deleteColumn: {
                        text: 'Eliminar columna'
                    },
                    deleteRow: {
                        text: 'Eliminar fila'
                    },
                    deleteTable: {
                        text: 'Eliminar tabla'
                    }
                }
            }
        },
        keyboard: {
            bindings: QuillBetterTable.keyboardBindings
        }
    }), []);

    const formats = [
        'header',
        'bold', 'italic', 'underline', 'strike',
        'list', 'bullet', 'indent',
        'link', 'image',
        'align', 'color', 'background',
        'table', 'table-cell-line'
    ];

    return (
        <div className={`rich-text-editor ${className || ''}`}>
            <ReactQuill
                ref={quillRef}
                theme="snow"
                value={value || ''}
                onChange={onChange}
                modules={modules}
                formats={formats}
                placeholder={placeholder}
                className="bg-white rounded-md"
            />

            {/* Botón adicional para URL de imagen */}
            <button
                type="button"
                onClick={insertImageURL}
                className="mt-2 text-xs text-gray-600 hover:text-gray-800 underline"
            >
                📎 Insertar imagen por URL
            </button>

            <style>{`
                .ql-container {
                    border-bottom-left-radius: 0.375rem;
                    border-bottom-right-radius: 0.375rem;
                    min-height: 150px;
                    font-size: 14px;
                }
                .ql-toolbar {
                    border-top-left-radius: 0.375rem;
                    border-top-right-radius: 0.375rem;
                }
                .ql-snow .ql-picker {
                    font-size: 14px;
                }
                
                /* Estilos para imágenes */
                .ql-editor img {
                    max-width: 100%;
                    height: auto;
                    border-radius: 4px;
                    margin: 10px 0;
                }
                
                /* Estilos para tablas */
                .ql-editor table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 10px 0;
                }
                .ql-editor table td,
                .ql-editor table th {
                    border: 1px solid #ddd;
                    padding: 8px;
                    min-width: 50px;
                }
                .ql-editor table th {
                    background-color: #f3f4f6;
                    font-weight: 600;
                }
                .ql-better-table-wrapper {
                    overflow-x: auto;
                }
            `}</style>
        </div>
    );
};

export default RichTextEditor;

