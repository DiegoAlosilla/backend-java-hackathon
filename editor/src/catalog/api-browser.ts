import {createSwaggerInspector} from '../inspector/swagger';
import type {ContractModel,OperationView} from '../contracts/types';
import type {CatalogHandlers} from './view';
import {el} from '../ui/styles';
import {bianBrowser} from './bian-browser';
import type {BianReference} from '../bian/reference';

export function apiBrowser(handlers:CatalogHandlers,importContract:()=>void,insertBian?:(reference:BianReference)=>void){
  const element=el('section','','ct-api-browser');element.setAttribute('aria-label','Contratos de API');
  const tools=el('div','','ct-api-tools'),importButton=el('button','Importar','geBtn');importButton.onclick=importContract;
  const toolbar=el('div','','ct-api-toolbar'),search=el('input');search.type='search';search.placeholder='Busca tu API';search.setAttribute('aria-label','Busca tu API');toolbar.append(search,importButton);
  const bianButton=el('button','Consultar BIAN','geBtn ct-bian-toggle');bianButton.type='button';bianButton.setAttribute('aria-pressed','false');
  let bian:ReturnType<typeof bianBrowser>|undefined,bianActive=false,lastOperation:OperationView|undefined,lastWholeContract=false;
  function leaveBian(){bian?.pause();bianActive=false;bianButton.setAttribute('aria-pressed','false');if(selected)select(selected,lastOperation,lastWholeContract);else listView();bianButton.focus();}
  function mountBian(focus=true){bian??=bianBrowser(leaveBian,insertBian);bianActive=true;bianButton.setAttribute('aria-pressed','true');element.dataset.view='bian';tools.replaceChildren(toolbar,bianButton);body.replaceChildren(bian.element);if(focus)bian.focus();}
  bianButton.onclick=()=>{if(bianActive)leaveBian();else mountBian();};
  const choices=el('div','','ct-api-choices');choices.setAttribute('role','list');choices.setAttribute('aria-label','APIs importadas');
  const status=el('p');status.setAttribute('role','status');status.hidden=true;
  tools.append(toolbar,choices,status);
  const body=el('div','','ct-api-document');element.append(tools,body);
  const inspector=createSwaggerInspector({insert:operation=>handlers.insert(operation,''),bindDrag:(node,operation)=>handlers.bindDrag(node,operation,()=> ''),close:()=>close(),insertAll:contract=>handlers.insertAll?.(contract)});
  let contracts:ContractModel[]=[],selected:ContractModel|undefined;
  const key=(contract:ContractModel)=>`${contract.revision.apiId}:${contract.revision.revisionId}`;
  function renderChoices(){
    const query=search.value.trim().toLocaleLowerCase();choices.replaceChildren();
    const matches=contracts.filter(contract=>`${contract.title} ${contract.declaredVersion} ${contract.sourceVersion}`.toLocaleLowerCase().includes(query));
    for(const contract of matches){const row=el('div');row.setAttribute('role','listitem');const button=el('button',`${contract.title} · ${contract.declaredVersion}`,'ct-api-choice');
      button.type='button';button.setAttribute('aria-label',`Seleccionar API ${contract.title} · ${contract.revision.apiId.slice(0,8)}`);button.setAttribute('aria-pressed',String(Boolean(selected&&key(selected)===key(contract))));
      button.title=`${contract.title} · API ${contract.declaredVersion} · ${contract.sourceVersion} · ${contract.revision.apiId}`;
      button.onclick=()=>select(contract);row.append(button);choices.append(row);}
    status.textContent=contracts.length?(matches.length?'':'Sin coincidencias'):'Importa un contrato para empezar.';status.hidden=!status.textContent;
  }
  function listView(){bian?.pause();bianActive=false;bianButton.setAttribute('aria-pressed','false');element.dataset.view='list';tools.replaceChildren(toolbar,bianButton,status);body.replaceChildren(choices);}
  function close(){selected=undefined;search.value='';listView();renderChoices();search.focus();}
  function select(contract:ContractModel,operation?:OperationView,wholeContract=false){bian?.pause();bianActive=false;bianButton.setAttribute('aria-pressed','false');selected=contract;lastOperation=operation;lastWholeContract=wholeContract;element.dataset.view='contract';tools.replaceChildren(toolbar,bianButton,choices,status);body.replaceChildren(inspector.show(contract,operation,false,wholeContract));renderChoices();}
  search.oninput=()=>{if(bianActive){selected=undefined;listView();}renderChoices();};
  listView();
  return {element,select,pauseBian(){bian?.pause();},showBianReference(raw:string){mountBian(false);bian!.showReference(raw);},resetBian(){bian?.reset();if(bianActive){selected=undefined;listView();}},imported(contract:ContractModel,duplicate:boolean){close();status.hidden=false;status.textContent=`${contract.title} · ${contract.line==='2.0'?'Swagger':'OpenAPI'} ${contract.sourceVersion} · ${contract.operations.length} operaciones${duplicate?' · archivo ya importado':' · contrato importado'}`;},setContracts(next:ContractModel[]){
    const previous=selected;contracts=next;selected=previous?next.find(contract=>key(contract)===key(previous)):undefined;
    if(bianActive)return;
    if(!selected)listView();
    else if(selected!==previous)select(selected);
    renderChoices();
  }};
}
