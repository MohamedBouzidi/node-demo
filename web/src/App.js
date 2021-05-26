import React, { useState, useEffect } from 'react';
import { makeStyles } from '@material-ui/core/styles';
import List from '@material-ui/core/List';
import ListItem from '@material-ui/core/ListItem';
import ListItemIcon from '@material-ui/core/ListItemIcon';
import ListItemText from '@material-ui/core/ListItemText';
import Divider from '@material-ui/core/Divider';
import PersonIcon from '@material-ui/icons/Person';
import EditIcon from '@material-ui/icons/Edit';
import DeleteOutlineIcon from '@material-ui/icons/DeleteOutline';
import Typography from '@material-ui/core/Typography';
import Card from '@material-ui/core/Card';
import CardContent from '@material-ui/core/CardContent';
import { API_URL } from './config.json';

const useStyles = makeStyles(theme => ({
    root: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: theme.palette.background.paper,
    },
    container: {
        display: 'flex',
        flexFlow: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'lightblue',
        height: '100vh',
    },
    list: {
        maxHeight: '210px',
        overflowY: 'scroll',
        overflowX: 'hidden',
    },
    title: {
        margin: theme.spacing(4, 0, 2),
        color: 'white',
    },
}));

function App() {
    const classes = useStyles();
    const [selectedPerson, setSelectedPerson] = useState(null);
    const [people, setPeople] = useState([]);

    useEffect(() => {
        fetch(API_URL + '/people')
            .then(res => res.json())
            .then(setPeople);
    }, []);

    const selectPerson = person => {
        setSelectedPerson(person);
    };

    const deletePerson = person => {
        fetch(API_URL + '/person/' + person.id)
            .then(res => res.json())
            .then(() => {
                const newPeople = people.filter(p => p.id !== person.id);
                setPeople(newPeople);
            });
    }

    return (
        <div className={classes.container}>
            <Typography variant="h4" className={classes.title}>
                People
            </Typography>
            <div className={classes.root}>
                <List
                    component="nav"
                    className={classes.list}
                    aria-label="main mailbox folders"
                >
                    {people ? (
                        people.map(p => (
                            <ListItem button onClick={() => selectPerson(p)}>
                                <ListItemIcon>
                                    <PersonIcon />
                                </ListItemIcon>
                                <ListItemText primary={p.name} />
                                <EditIcon />
                                <DeleteOutlineIcon onClick={() => console.log('delete this')} />
                            </ListItem>
                        ))
                    ) : (
                        <Typography>Loading...</Typography>
                    )}
                </List>
                <Divider />
                <Card>
                    <CardContent>
                        {selectedPerson ? (
                            <Typography>
                                {selectedPerson.name} - {selectedPerson.phone}
                            </Typography>
                        ) : (
                            <Typography>Hello There</Typography>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

export default App;
