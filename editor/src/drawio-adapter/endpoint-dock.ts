import {apiBrowser} from '../catalog/api-browser';
import type {CatalogHandlers} from '../catalog/view';
import {contractStyles,el} from '../ui/styles';
import {readContract} from '../contracts/import';
import type {ContractModel,OperationView} from '../contracts/types';
import {readRegistry,findRevision,REF_ATTRIBUTE,REGISTRY_ATTRIBUTE} from '../persistence/registry';
import {contractCell,selectionContractTarget} from './component-figure';
import {BIAN_REF_ATTRIBUTE} from '../bian/reference';
import {insertBianFigure} from './bian-figure';
import {installAuditPanel} from './audit-panel';

declare const mxEvent:any;
export interface EndpointDock{
  configure:(handlers:CatalogHandlers)=>void;
  imported:(contract:ContractModel,duplicate:boolean)=>void;
  showCatalog:(content?:HTMLElement,linkMode?:boolean)=>void;
  preview:(contract:ContractModel,operation:OperationView)=>void;
  reveal:()=>void;
  selectInserted:(cell:any)=>void;
  refresh:()=>void;
}
export function installEndpointDock(ui:any):EndpointDock{
  contractStyles();const graph=ui.editor.graph,native=ui.formatContainer,format=ui.format;
  const root=el('aside','','ct-native-contracts');root.setAttribute('aria-label','Panel de contratos');
  // The native sidebar permits INPUT/SELECT but cancels TEXTAREA mouse focus
  // and text selection. Extend its instance hook only for our text areas.
  const isSelectionAllowed=ui.isSelectionAllowed;
  ui.isSelectionAllowed=function(event:Event){
    const target=event.target;
    return target instanceof HTMLTextAreaElement&&root.contains(target)||isSelectionAllowed.call(this,event);
  };
  let handlers:CatalogHandlers={insert:()=>{},bindDrag:()=>{}};
  const browser=apiBrowser({insert:(...args)=>handlers.insert(...args),insertAll:contract=>handlers.insertAll?.(contract),bindDrag:(...args)=>handlers.bindDrag(...args)},()=>ui.actions.get('contractsImport').funct(),reference=>{const cell=insertBianFigure(ui,reference);suppressSelection=true;try{graph.setSelectionCell(cell);graph.scrollCellToVisible(cell);}finally{suppressSelection=false;}});root.append(browser.element);
  let active=false,tab:HTMLElement|undefined,customContent:HTMLElement|undefined,suppressSelection=false;
  let cachedRaw:string|null|undefined,cachedNode:any,contracts:ContractModel[]=[];
  const resizer=el('div','','ct-contracts-resizer');resizer.tabIndex=0;resizer.title='Arrastra para ajustar el ancho · Flechas para ajustar con teclado';resizer.setAttribute('role','separator');resizer.setAttribute('aria-label','Ancho del panel de contratos');resizer.setAttribute('aria-orientation','vertical');
  let preferredWidth:number|undefined;
  const bounds=()=>({min:Math.min(300,window.innerWidth-40),max:Math.min(1000,window.innerWidth-40)});
  function resize(width:number){preferredWidth=Math.round(Math.max(bounds().min,Math.min(bounds().max,width)));size();}
  resizer.onpointerdown=event=>{if(event.button!==0)return;event.preventDefault();const start=event.clientX,width=native.getBoundingClientRect().width;resizer.setPointerCapture(event.pointerId);
    resizer.onpointermove=move=>resize(width+start-move.clientX);
    const finish=()=>{resizer.onpointermove=null;};resizer.onpointerup=finish;resizer.onlostpointercapture=finish;
  };
  resizer.onkeydown=event=>{const width=native.getBoundingClientRect().width;if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();resize(width+(event.key==='ArrowLeft'?20:-20));}else if(event.key==='Home'||event.key==='End'){event.preventDefault();resize(event.key==='Home'?bounds().min:bounds().max);}};

  function sync(){
    const raw=ui.fileNode?.getAttribute(REGISTRY_ATTRIBUTE)??null,node=ui.fileNode;
    if(raw===cachedRaw&&node===cachedNode)return;
    if(node!==cachedNode)browser.resetBian();
    cachedRaw=raw;cachedNode=node;
    try{contracts=readRegistry(raw).revisions.map(readContract);browser.setContracts(contracts);}
    catch(error){cachedRaw=undefined;contracts=[];browser.setContracts([]);root.replaceChildren(el('p',error instanceof Error?error.message:String(error),'ct-api-empty'));root.dataset.contractUnavailable='true';return;}
    delete root.dataset.contractUnavailable;
    if(!customContent)root.replaceChildren(browser.element);
  }
  function size(){
    native.classList.toggle('ct-contracts-wide',active);
    const {min,max}=bounds(),width=Math.round(Math.max(min,Math.min(max,preferredWidth??Math.min(560,Math.max(300,window.innerWidth*.4)))));
    native.style.setProperty('--ct-panel-width',`${width}px`);resizer.hidden=!active;
    resizer.setAttribute('aria-valuemin',String(min));resizer.setAttribute('aria-valuemax',String(max));resizer.setAttribute('aria-valuenow',String(width));
  }
  function apply(){
    // Swagger's white document is isolated; extension controls follow the editor.
    root.style.setProperty('--ct-editor-scheme',document.body.classList.contains('geDarkMode')?'dark':'light');
    ui.container.classList.toggle('ct-contracts-open',active&&ui.formatWidth>0);
    if(!tab)return;
    const header=tab.parentElement!;
    if(active){for(const item of Array.from(header.children))item.classList.toggle('geActiveFormatTitle',item===tab);}
    tab.setAttribute('aria-selected',String(active));root.hidden=!active;
    if(active){for(const child of Array.from(native.children) as HTMLElement[])if(child!==header&&child!==root&&child!==resizer)child.style.display='none';}
    size();
  }
  function open(){
    active=true;sync();
    if(ui.formatWidth===0)ui.actions.get('format').funct();
    if(!tab?.isConnected)format.immediateRefresh();apply();
  }
  // Extend the instance's native refresh; keep the upstream file and tab handlers
  // intact. Its clear() destroys native panels, so detach our persistent view first.
  const refresh=format.immediateRefresh;
  format.immediateRefresh=function(...args:any[]){
    if(native.offsetWidth===0)return refresh.apply(this,args);
    const focused=document.activeElement instanceof HTMLElement&&root.contains(document.activeElement)?document.activeElement:null;
    const scrolls=Array.from(root.querySelectorAll<HTMLElement>('.ct-swagger-scroll,.ct-bian-scroll,.ct-bian-list-scroll')).map(element=>({element,top:element.scrollTop}));
    root.remove();resizer.remove();const result=refresh.apply(this,args);
    const header=native.querySelector('.geFormatTitleContainer');
    if(header){
      tab=el('div','','geFormatTitle');tab.append(el('div','Contratos'));tab.title='Contratos';tab.setAttribute('role','tab');tab.tabIndex=0;
      tab.onclick=()=>{customContent=undefined;root.replaceChildren(browser.element);open();};
      tab.onkeydown=event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();tab!.click();}};
      for(const title of Array.from(header.children) as HTMLElement[]){
        title.addEventListener('click',()=>{browser.pauseBian();active=false;customContent=undefined;root.hidden=true;ui.container.classList.remove('ct-contracts-open');tab?.classList.remove('geActiveFormatTitle');tab?.setAttribute('aria-selected','false');size();format.refresh();});
      }
      header.append(tab);native.append(root,resizer);apply();
      if(active)for(const {element,top} of scrolls)element.scrollTop=top;
      if(active&&focused?.isConnected)focused.focus({preventScroll:true});
    }
    return result;
  };
  graph.getModel().addListener(mxEvent.CHANGE,()=>sync());
  function selectionChanged(clicked?:any){
    if(suppressSelection)return;
    const cells=graph.getSelectionCells();if(cells.length!==1)return;
    try{
      const bian=graph.getAttributeForCell(clicked??cells[0],BIAN_REF_ATTRIBUTE,'');
      if(bian){sync();customContent=undefined;browser.showBianReference(bian);root.replaceChildren(browser.element);open();return;}
      const target=selectionContractTarget(graph,clicked??cells[0]);
      if(!target){
        const cell=clicked??cells[0];
        if(graph.getAttributeForCell(cell,'auditEvidence','')||graph.getAttributeForCell(cell,'auditFlow','')){
          customContent=el('p','Evidencia del componente seleccionado','ct-api-empty');
          root.replaceChildren(customContent);open();
        }
        return;
      }
      sync();const contract=contracts.find(item=>item.revision.apiId===target.ref.apiId&&item.revision.revisionId===target.ref.revisionId);
      if(!contract)throw new Error('Contrato no disponible: falta la revisión en este documento.');
      const operation=target.api?undefined:contract.operations.find(item=>item.ref.method===target.ref.method&&item.ref.path===target.ref.path);
      if(!target.api&&!operation)throw new Error('Contrato no disponible: operación ausente.');
      customContent=undefined;browser.select(contract,operation,true);root.replaceChildren(browser.element);open();
    }catch(error){customContent=undefined;root.replaceChildren(el('p',error instanceof Error?error.message:String(error),'ct-api-empty'));open();}
  }
  graph.getSelectionModel().addListener(mxEvent.CHANGE,()=>selectionChanged());
  graph.addListener(mxEvent.CLICK,(_sender:any,event:any)=>{const cell=event.getProperty('cell');if(cell)selectionChanged(cell);});
  ui.editor.addListener('fileLoaded',()=>{customContent=undefined;cachedNode=undefined;sync();});
  ui.editor.addListener('pageSelected',sync);
  ui.addListener('formatWidthChanged',()=>{if(ui.formatWidth===0)browser.pauseBian();ui.container.classList.toggle('ct-contracts-open',active&&ui.formatWidth>0);size();});
  window.addEventListener('resize',size);
  let dimensions='';new ResizeObserver(()=>{const next=`${ui.diagramContainer.clientWidth}:${ui.diagramContainer.clientHeight}`;if(next!==dimensions){dimensions=next;graph.sizeDidChange();}}).observe(ui.diagramContainer);
  sync();format.refresh();installAuditPanel(ui,root);
  return {
    configure(next){handlers=next;},
    selectInserted(cell){suppressSelection=true;try{graph.setSelectionCell(cell);graph.scrollCellToVisible(cell);}finally{suppressSelection=false;}},
    imported(contract,duplicate){customContent=undefined;sync();browser.imported(contract,duplicate);root.replaceChildren(browser.element);open();},
    showCatalog(content,linkMode=false){customContent=linkMode?content:undefined;root.replaceChildren(customContent??browser.element);open();},
    preview(contract,operation){customContent=undefined;browser.select(contract,operation);root.replaceChildren(browser.element);open();},
    reveal(){
      customContent=undefined;sync();root.replaceChildren(browser.element);
      const cell=contractCell(graph,graph.getSelectionCell()),raw=cell&&graph.getAttributeForCell(cell,REF_ATTRIBUTE,'');
      if(raw){try{const ref=JSON.parse(raw),contract=contracts.find(item=>item.revision.apiId===ref.apiId&&item.revision.revisionId===ref.revisionId)??readContract(findRevision(readRegistry(ui.fileNode?.getAttribute(REGISTRY_ATTRIBUTE)),ref));const operation=contract.operations.find(item=>item.ref.method===ref.method&&item.ref.path===ref.path);if(!operation)throw Error('Contrato no disponible: operación ausente.');browser.select(contract,operation);}catch(error){root.replaceChildren(el('p',`Contrato no disponible: ${error instanceof Error?error.message:String(error)}`,'ct-api-empty'));}}
      open();
    },
    refresh(){cachedRaw=undefined;sync();},
  };
}
