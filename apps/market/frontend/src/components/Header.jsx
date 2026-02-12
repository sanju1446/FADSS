import React from 'react';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import Avatar from '@mui/material/Avatar';
export default function Header(){
  return (
    <AppBar position="static" color="transparent" elevation={0} style={{borderBottom:'1px solid rgba(0,0,0,0.05)'}}>
      <Toolbar>
        <div style={{display:'flex', alignItems:'center', flexGrow:1}}>
          <div style={{background:'#2f6f3a', color:'white', padding:6, borderRadius:6, fontWeight:700}}>FADSS</div>
          <Typography variant="h6" style={{marginLeft:12, color:'#2f6f3a'}}> Farmer Advisory System</Typography>
        </div>
        <div style={{display:'flex', alignItems:'center', gap:12}}>
          <div style={{textAlign:'right'}}>
            <div style={{fontSize:12, color:'#666'}}>Logged in as: Amoolya Gajula</div>
            <div style={{fontSize:12, color:'#999'}}>amoolyagajula@gmail.com</div>
          </div>
          <Avatar>AG</Avatar>
        </div>
      </Toolbar>
    </AppBar>
  );
}