export type AdminPerson = {id:string;username?:string|null;email?:string|null;wallet?:string|null;isAdmin?:boolean|null;isWhiteListed?:boolean|null;isHidden?:boolean|null};
export function filterPeople<T extends AdminPerson>(data:T[],query:string,role:string,visibility:string):T[] {
 const text=query.trim().toLowerCase();
 return data.filter(person=>{
  if(role==='Admin' && !person.isAdmin) return false;
  if(role==='Whitelisted' && !person.isWhiteListed) return false;
  if(role==='User' && (person.isAdmin || person.isWhiteListed)) return false;
  if(visibility==='Hidden' && !person.isHidden) return false;
  if(visibility==='Visible' && person.isHidden) return false;
  return [person.username,person.email,person.wallet].some(value=>(value ?? '').toLowerCase().includes(text));
 });
}
