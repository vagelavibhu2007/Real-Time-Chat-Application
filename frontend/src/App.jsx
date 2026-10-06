import { useEffect, useState } from 'react'
import Navbar from './components/Navbar.jsx'
import { Routes, Route, Navigate } from 'react-router'
import HomePage from './pages/HomePage.jsx'
import LoginPage from './pages/LoginPage.jsx'
import SignUpPage from './pages/SignUpPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import ProfilePage from './pages/ProfilePage.jsx'
import { useAuthStore } from './store/useAuthStore.js'
import { Loader } from 'lucide-react'
import { Toaster } from "react-hot-toast";
import { useThemeStore } from './store/useThemeStore.js'

function App() {

    const { authUser, checkAuth, isCheckingAuth ,onlineUsers} = useAuthStore()
    const {theme} = useThemeStore()

    useEffect(() => {
        checkAuth()
    }, [checkAuth])


    //loading animation
    if(isCheckingAuth && !authUser){
        return(
            <div className='flex items-center justify-center h-screen'>
                <Loader className='size-10 animate-spin'></Loader>
            </div>
        )
    }

    return (
        <div data-theme={theme}>
            <Navbar />

            <Routes>
                <Route path='/' element={authUser ? <HomePage /> : <Navigate to='/login'/> }  />
                <Route path='/login' element={!authUser ? <LoginPage /> : <Navigate to='/'/>} />
                <Route path='/signup' element={!authUser ? <SignUpPage /> : <Navigate to='/'/>} />
                <Route path='/profile' element={authUser ? <ProfilePage /> : <Navigate to='/login'/>} />
                <Route path='/settings' element={<SettingsPage />} />
            </Routes>

            <Toaster />
        </div>
    )
}

export default App
