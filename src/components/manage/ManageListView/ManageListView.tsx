'use client';

import { PencilSimple, Plus, Trash } from '@phosphor-icons/react';
import { Button } from '@/components/common/Button';
import IconButton from '@/components/common/IconButton';
import {
  MOCK_IMAGE_STYLES,
  MOCK_PRODUCTS,
  MOCK_PRODUCT_STYLES,
  MOCK_CHARACTERS,
  MOCK_CHARACTER_LOCATIONS,
} from '@/lib/mock-data';
import { useChat, ManagerModalType, SettingsPanelType } from '@/lib/chat-context';
import styles from './ManageListView.module.css';

const PANEL_TITLES: Record<string, string> = {
  styles: 'Image Styles',
  products: 'Products',
  'product-styles': 'Product Styles',
  characters: 'Characters',
  'character-locations': 'Locations',
  account: 'User Settings',
  brand: 'Brand Settings',
};

export default function ManageListView() {
  const { state, dispatch } = useChat();
  const panel: SettingsPanelType = state.activeSettingsPanel ?? 'styles';

  const openForm = (
    modal: ManagerModalType,
    action: 'create' | 'edit',
    tab?: 'products' | 'styles' | 'characters' | 'locations',
    item?: unknown
  ) => {
    dispatch({ type: 'SET_MANAGER_MODAL', payload: modal });
    dispatch({
      type: 'SET_MANAGER_MODAL_FORM_INIT',
      payload: { modal, action, tab, item },
    });
  };

  const handleCreateStyle = () => openForm('imageStyle', 'create');
  const handleEditStyle = (style: (typeof MOCK_IMAGE_STYLES)[0]) =>
    openForm('imageStyle', 'edit', undefined, style);

  const handleCreateProduct = () => openForm('products', 'create', 'products');
  const handleEditProduct = (product: (typeof MOCK_PRODUCTS)[0]) =>
    openForm('products', 'edit', 'products', product);
  const handleCreateProductStyle = () => openForm('products', 'create', 'styles');
  const handleEditProductStyle = (style: (typeof MOCK_PRODUCT_STYLES)[0]) =>
    openForm('products', 'edit', 'styles', style);

  const handleCreateCharacter = () => openForm('characters', 'create', 'characters');
  const handleEditCharacter = (char: (typeof MOCK_CHARACTERS)[0]) =>
    openForm('characters', 'edit', 'characters', char);
  const handleCreateLocation = () => openForm('characters', 'create', 'locations');
  const handleEditLocation = (loc: (typeof MOCK_CHARACTER_LOCATIONS)[0]) =>
    openForm('characters', 'edit', 'locations', loc);

  const title = panel ? PANEL_TITLES[panel] ?? '' : '';

  if (panel === 'account') {
    return (
      <div className={styles.layout}>
        <div className={styles.toolbar}>
          <h2 className={styles.title}>{title}</h2>
          <div />
        </div>
        <div className={styles.body}>
          <div className={styles.placeholder}>
            <p>User settings will be available here.</p>
          </div>
        </div>
      </div>
    );
  }

  if (panel === 'brand') {
    return (
      <div className={styles.layout}>
        <div className={styles.toolbar}>
          <h2 className={styles.title}>{title}</h2>
          <div />
        </div>
        <div className={styles.body}>
          <div className={styles.placeholder}>
            <p>Brand settings will be available here.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.layout}>
      {panel === 'styles' && (
        <>
          <div className={styles.toolbar}>
            <h2 className={styles.title}>{title}</h2>
            <Button variant="primary" size="sm" onClick={handleCreateStyle} icon={<Plus size={16} />}>
              Add Style
            </Button>
          </div>
          <div className={styles.body}>
            {MOCK_IMAGE_STYLES.length > 0 ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Style</th>
                    <th>Description</th>
                    <th style={{ width: 80 }} />
                  </tr>
                </thead>
                <tbody>
                  {MOCK_IMAGE_STYLES.map((style) => (
                    <tr key={style.id} onClick={() => handleEditStyle(style)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={style.image} alt="" className={styles.cellThumb} />
                          <span className={styles.cellName}>{style.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className={styles.cellMeta}>{style.description}</span>
                      </td>
                      <td>
                        <div className={styles.cellActions} onClick={(e) => e.stopPropagation()}>
                          <IconButton variant="ghost" size="sm" title="Edit" onClick={() => handleEditStyle(style)}>
                            <PencilSimple size={14} />
                          </IconButton>
                          <IconButton variant="ghost" size="sm" color="danger" title="Delete">
                            <Trash size={14} />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.empty}>
                <p>No image styles yet</p>
                <p>Add your first style to get started.</p>
              </div>
            )}
          </div>
        </>
      )}

      {panel === 'products' && (
        <>
          <div className={styles.toolbar}>
            <h2 className={styles.title}>{title}</h2>
            <Button variant="primary" size="sm" onClick={handleCreateProduct} icon={<Plus size={16} />}>
              Add Product
            </Button>
          </div>
          <div className={styles.body}>
            {MOCK_PRODUCTS.length > 0 ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Category</th>
                    <th style={{ width: 80 }} />
                  </tr>
                </thead>
                <tbody>
                  {MOCK_PRODUCTS.map((product) => (
                    <tr key={product.id} onClick={() => handleEditProduct(product)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={product.image} alt="" className={styles.cellThumb} />
                          <span className={styles.cellName}>{product.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className={styles.cellMeta}>{product.category}</span>
                      </td>
                      <td>
                        <div className={styles.cellActions} onClick={(e) => e.stopPropagation()}>
                          <IconButton variant="ghost" size="sm" title="Edit" onClick={() => handleEditProduct(product)}>
                            <PencilSimple size={14} />
                          </IconButton>
                          <IconButton variant="ghost" size="sm" color="danger" title="Delete">
                            <Trash size={14} />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.empty}>
                <p>No products yet</p>
                <p>Add your first product to get started.</p>
              </div>
            )}
          </div>
        </>
      )}

      {panel === 'product-styles' && (
        <>
          <div className={styles.toolbar}>
            <h2 className={styles.title}>{title}</h2>
            <Button variant="primary" size="sm" onClick={handleCreateProductStyle} icon={<Plus size={16} />}>
              Add Product Style
            </Button>
          </div>
          <div className={styles.body}>
            {MOCK_PRODUCT_STYLES.length > 0 ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Style</th>
                    <th>Description</th>
                    <th style={{ width: 80 }} />
                  </tr>
                </thead>
                <tbody>
                  {MOCK_PRODUCT_STYLES.map((style) => (
                    <tr key={style.id} onClick={() => handleEditProductStyle(style)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={style.image} alt="" className={styles.cellThumb} />
                          <span className={styles.cellName}>{style.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className={styles.cellMeta}>{style.description}</span>
                      </td>
                      <td>
                        <div className={styles.cellActions} onClick={(e) => e.stopPropagation()}>
                          <IconButton variant="ghost" size="sm" title="Edit" onClick={() => handleEditProductStyle(style)}>
                            <PencilSimple size={14} />
                          </IconButton>
                          <IconButton variant="ghost" size="sm" color="danger" title="Delete">
                            <Trash size={14} />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.empty}>
                <p>No product styles yet</p>
                <p>Add your first style to get started.</p>
              </div>
            )}
          </div>
        </>
      )}

      {panel === 'characters' && (
        <>
          <div className={styles.toolbar}>
            <h2 className={styles.title}>{title}</h2>
            <Button variant="primary" size="sm" onClick={handleCreateCharacter} icon={<Plus size={16} />}>
              Add Character
            </Button>
          </div>
          <div className={styles.body}>
            {MOCK_CHARACTERS.length > 0 ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Character</th>
                    <th>Role</th>
                    <th style={{ width: 80 }} />
                  </tr>
                </thead>
                <tbody>
                  {MOCK_CHARACTERS.map((char) => (
                    <tr key={char.id} onClick={() => handleEditCharacter(char)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={char.image} alt="" className={`${styles.cellThumb} ${styles.cellThumbRound}`} />
                          <span className={styles.cellName}>{char.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className={styles.cellMeta}>{char.role}</span>
                      </td>
                      <td>
                        <div className={styles.cellActions} onClick={(e) => e.stopPropagation()}>
                          <IconButton variant="ghost" size="sm" title="Edit" onClick={() => handleEditCharacter(char)}>
                            <PencilSimple size={14} />
                          </IconButton>
                          <IconButton variant="ghost" size="sm" color="danger" title="Delete">
                            <Trash size={14} />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.empty}>
                <p>No characters yet</p>
                <p>Add your first character to get started.</p>
              </div>
            )}
          </div>
        </>
      )}

      {panel === 'character-locations' && (
        <>
          <div className={styles.toolbar}>
            <h2 className={styles.title}>{title}</h2>
            <Button variant="primary" size="sm" onClick={handleCreateLocation} icon={<Plus size={16} />}>
              Add Location
            </Button>
          </div>
          <div className={styles.body}>
            {MOCK_CHARACTER_LOCATIONS.length > 0 ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Location</th>
                    <th>Description</th>
                    <th style={{ width: 80 }} />
                  </tr>
                </thead>
                <tbody>
                  {MOCK_CHARACTER_LOCATIONS.map((loc) => (
                    <tr key={loc.id} onClick={() => handleEditLocation(loc)}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={loc.image} alt="" className={styles.cellThumb} />
                          <span className={styles.cellName}>{loc.name}</span>
                        </div>
                      </td>
                      <td>
                        <span className={styles.cellMeta}>{loc.description}</span>
                      </td>
                      <td>
                        <div className={styles.cellActions} onClick={(e) => e.stopPropagation()}>
                          <IconButton variant="ghost" size="sm" title="Edit" onClick={() => handleEditLocation(loc)}>
                            <PencilSimple size={14} />
                          </IconButton>
                          <IconButton variant="ghost" size="sm" color="danger" title="Delete">
                            <Trash size={14} />
                          </IconButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className={styles.empty}>
                <p>No locations yet</p>
                <p>Add your first location to get started.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
