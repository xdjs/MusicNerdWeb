import {filterPeople} from '../filterPeople';
const people=[{id:'one',username:'Pete',email:'pete@example.com',wallet:'0xABCD',isAdmin:true,isWhiteListed:true,isHidden:false},{id:'two',username:'Sweetman',email:null,wallet:null,isAdmin:false,isWhiteListed:true,isHidden:true},{id:'three',username:null,email:null,wallet:'0x222',isAdmin:false,isWhiteListed:false,isHidden:false}];
it('combines role and visibility without excluding admins from whitelist membership',()=>{
 expect(filterPeople(people,'','Whitelisted','All').map(p=>p.id)).toEqual(['one','two']);
 expect(filterPeople(people,'','Whitelisted','Hidden').map(p=>p.id)).toEqual(['two']);
});
it('searches email, username and wallet with trimmed case-insensitive input',()=>{
 expect(filterPeople(people,' PETE@EXAMPLE.COM ','All','All').map(p=>p.id)).toEqual(['one']);
 expect(filterPeople(people,'abcd','All','All').map(p=>p.id)).toEqual(['one']);
 expect(filterPeople(people,'  sweetMAN ','All','All').map(p=>p.id)).toEqual(['two']);
 expect(filterPeople(people,'missing','All','All')).toEqual([]);
});
