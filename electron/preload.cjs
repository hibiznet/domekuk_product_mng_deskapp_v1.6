const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  login: p => ipcRenderer.invoke('login', p),
  changePassword: p => ipcRenderer.invoke('change-password', p),
  getYears: () => ipcRenderer.invoke('get-years'),
  ensureYear: y => ipcRenderer.invoke('ensure-year', y),
  getCategories: y => ipcRenderer.invoke('get-categories', y),
  addCategory: p => ipcRenderer.invoke('add-category', p),
  renameCategory: p => ipcRenderer.invoke('rename-category', p),
  deleteCategory: id => ipcRenderer.invoke('delete-category', id),
  getProducts: p => ipcRenderer.invoke('get-products', p),
  saveProduct: p => ipcRenderer.invoke('save-product', p),
  deleteProduct: id => ipcRenderer.invoke('delete-product', id),
  backup: () => ipcRenderer.invoke('backup'),
  exportExcel: p => ipcRenderer.invoke('export-excel', p),
  importExcel: () => ipcRenderer.invoke('import-excel'),
  cleanupLegacyDuplicates: p => ipcRenderer.invoke('cleanup-legacy-duplicates', p),
  rendererCloseDecision: p => ipcRenderer.invoke('renderer-close-decision', p),
  forceClose: () => ipcRenderer.invoke('force-close'),
  onRequestClose: callback => ipcRenderer.on('request-close-decision', callback)
});
